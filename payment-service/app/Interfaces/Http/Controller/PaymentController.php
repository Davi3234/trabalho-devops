<?php

namespace App\Interfaces\Http\Controller;

use App\Application\UseCase\ProcessPayment\ProcessPaymentDTO;
use App\Application\UseCase\ProcessPayment\ProcessPaymentHandler;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Laravel\Lumen\Routing\Controller as BaseController;
use Symfony\Component\HttpFoundation\Response;

class PaymentController extends BaseController{
    public function __construct(
        private ProcessPaymentHandler $processPaymentHandler
    ) {}

    public function process(Request $request): JsonResponse{
        $data = $request->json()->all();

        $request->merge($data); // Merge JSON data into request

        Validator::make($request->all(), [
            'order_id' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:credit_card,pix,boleto',
            'payment_data' => 'sometimes|array',
        ])->validate();

        $dto = new ProcessPaymentDTO(
            $request->input('order_id'),
            $request->input('amount'),
            $request->input('method'),
            $request->input('payment_data', [])
        );

        $response = $this->processPaymentHandler->handle($dto);

        return response()->json([
            'success' => true,
            'data' => $response->toArray(),
            'message' => 'Pagamento processado com sucesso.'
        ], Response::HTTP_OK);
    }

    public function handleStockReserved(Request $request): JsonResponse{
        $orderId = $request->get('order_id');
        $amount = $request->get('amount');
        $method = $request->get('method', 'credit_card');
        $paymentData = $request->get('payment_data', []);

        $dto = new ProcessPaymentDTO($orderId, $amount, $method, $paymentData);

        try {
            $response = $this->processPaymentHandler->handle($dto);
            return response()->json([
                'success' => true,
                'data' => $response->toArray(),
                'message' => 'Pagamento processado do estoque reservado.'
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }
}

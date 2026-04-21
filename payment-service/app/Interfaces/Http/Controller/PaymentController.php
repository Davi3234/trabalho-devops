<?php

namespace App\Interfaces\Http\Controller;

use App\Application\UseCase\ProcessPayment\ProcessPaymentDTO;
use App\Application\UseCase\ProcessPayment\ProcessPaymentHandler;
use App\Interfaces\Http\Request\ProcessPaymentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Lumen\Routing\Controller as BaseController;
use Symfony\Component\HttpFoundation\Response;

class PaymentController extends BaseController{
    public function __construct(
        private ProcessPaymentHandler $processPaymentHandler
    ) {}

    public function process(ProcessPaymentRequest $request): JsonResponse{
        $dto = new ProcessPaymentDTO(
            $request->get('order_id'),
            $request->get('amount'),
            $request->get('method'),
            $request->get('payment_data', [])
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
        $method = $request->get('method', 'credit_card'); // Default or from request
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

<?php
require_once 'config.php'; 

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    // addPayment {orderID, paymentMethod, amount, paymentStatus} -> response success message
    
    if ($action === 'addPayment') {

        $orderID = $input['orderID'] ?? null;
        $paymentMethod = $input['paymentMethod'] ?? '';
        $amount = $input['amount'] ?? 0;
        $paymentStatus = $input['paymentStatus'] ?? 'Pending'; 


        if (empty($orderID) || empty($paymentMethod) || empty($amount)) {
            $response['message'] = 'Order ID, payment method, and amount are required.';
            echo json_encode($response);
            exit();
        }

        $stmt = $mysqli->prepare("INSERT INTO Payments (orderID, paymentMethod, amount, paymentStatus) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isds", $orderID, $paymentMethod, $amount, $paymentStatus);

        if ($stmt->execute()) {
            $response['success'] = true;
            $response['message'] = 'Payment recorded successfully!';
            $response['paymentID'] = $mysqli->insert_id; 
        } else {
            $response['message'] = 'Failed to record payment: ' . $stmt->error;
        }
        $stmt->close();
    } else {
        $response['message'] = 'Invalid action specified for POST request.';
    }
} else {
    $response['message'] = 'Invalid request method. Only POST requests are allowed.';
}

$mysqli->close();
echo json_encode($response);
?>

<?php

require_once 'config.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    // addContact {orderID, name, phone, email, address}
    
    if ($action === 'addContact') {
        $orderID = $input['orderID'] ?? null;
        $name = $input['name'] ?? '';
        $phone = $input['phone'] ?? null;
        $email = $input['email'] ?? null; // Get email
        $address = $input['address'] ?? null;
        // New data for email sending
        $orderType = $input['orderType'] ?? null;
        $orderTotal = $input['orderTotal'] ?? null;
        $orderStatus = $input['orderStatus'] ?? 'Pending'; 
        $orderItems = $input['orderItems'] ?? [];


        if (empty($orderID) || empty($name)) {
            $response['message'] = 'Order ID and name are required for contact information.';
            echo json_encode($response);
            exit();
        }

        try {
            // Check if a contact already exists for orderID
            $stmt_check = $mysqli->prepare("SELECT contactID FROM Contact WHERE orderID = ?");
            $stmt_check->bind_param("i", $orderID);
            $stmt_check->execute();
            $stmt_check->store_result();

            if ($stmt_check->num_rows > 0) {
                // Update if contact info exists
                $stmt_update = $mysqli->prepare("UPDATE Contact SET name = ?, phone = ?, email = ?, address = ? WHERE orderID = ?");
                $stmt_update->bind_param("ssssi", $name, $phone, $email, $address, $orderID);
                if (!$stmt_update->execute()) {
                    throw new Exception('Failed to update contact information: ' . $stmt_update->error);
                }
                $stmt_update->close();
                $response['success'] = true;
                $response['message'] = 'Contact information updated successfully!';
            } else {
                // Add new contact information
                $stmt_insert = $mysqli->prepare("INSERT INTO Contact (orderID, name, phone, email, address) VALUES (?, ?, ?, ?, ?)");
                $stmt_insert->bind_param("issss", $orderID, $name, $phone, $email, $address);
                if (!$stmt_insert->execute()) {
                    throw new Exception('Failed to add contact information: ' . $stmt_insert->error);
                }
                $stmt_insert->close();
                $response['success'] = true;
                $response['message'] = 'Contact information saved successfully!';
                $response['contactID'] = $mysqli->insert_id;
            }
            $stmt_check->close();

            


        } catch (Exception $e) {
            $response['message'] = $e->getMessage();
        }
    }

    else {
        $response['message'] = 'Invalid action specified for POST request.';
    }
} else {
    $response['message'] = 'Invalid request method.';
}

$mysqli->close();
echo json_encode($response);
?>
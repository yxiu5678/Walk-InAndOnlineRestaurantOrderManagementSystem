<?php
require_once 'config.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    // addOrder {type, tableNo, total, customerID, staffID, items: [{mealID, quantity}]}
    if ($action === 'addOrder') {
        $type = $input['type'] ?? '';
        $tableNo = $input['tableNo'] ?? null; // Can be null for online orders
        $total = $input['total'] ?? 0;
        $customerID = $input['customerID'] ?? null;
        $staffID = $input['staffID'] ?? null;
        $items = $input['items'] ?? [];

        if (empty($type) || empty($total)) {
            $response['message'] = 'Order type and total are required.';
            echo json_encode($response);
            exit();
        }

        $mysqli->begin_transaction();

        try {
            // Add order to Orders
            $stmt = $mysqli->prepare("INSERT INTO Orders (type, tableNo, status, total, customerID, staffID) VALUES (?, ?, ?, ?, ?, ?)");
            $status = 'Pending'; // Default status for new orders
            $stmt->bind_param("sssdis", $type, $tableNo, $status, $total, $customerID, $staffID);

            if (!$stmt->execute()) {
                throw new Exception('Failed to add order: ' . $stmt->error);
            }
            $orderID = $mysqli->insert_id;
            $stmt->close();

            // Add meal items to Order_Meals
            $stmt_meals = $mysqli->prepare("INSERT INTO Order_Meals (orderID, mealID, quantity) VALUES (?, ?, ?)");
            foreach ($items as $item) {
                $mealID = $item['mealID'];
                $quantity = $item['quantity'];
                $stmt_meals->bind_param("iii", $orderID, $mealID, $quantity);
                if (!$stmt_meals->execute()) {
                    throw new Exception('Failed to add meal to order: ' . $stmt_meals->error);
                }
            }
            $stmt_meals->close();

            $mysqli->commit();
            $response['success'] = true;
            $response['message'] = 'Order placed successfully!';
            $response['orderID'] = $orderID;

        } catch (Exception $e) {
            $mysqli->rollback();
            $response['message'] = $e->getMessage();
        }

    }
    // updateOrderStatus {orderID, status}
    else if ($action === 'updateOrderStatus') {
        $orderID = $input['orderID'] ?? '';
        $status = $input['status'] ?? '';

        if (empty($orderID) || empty($status)) {
            $response['message'] = 'Order ID and status are required.';
            echo json_encode($response);
            exit();
        }

        $stmt = $mysqli->prepare("UPDATE Orders SET status = ? WHERE orderID = ?");
        $stmt->bind_param("si", $status, $orderID);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                $response['success'] = true;
                $response['message'] = 'Order status updated successfully!';
            } else {
                $response['message'] = 'Order not found or status already set.';
            }
        } else {
            $response['message'] = 'Failed to update order status: ' . $stmt->error;
        }
        $stmt->close();
    }
    // deleteOrder {orderID}
    else if ($action === 'deleteOrder') {
        $orderID = $input['orderID'] ?? '';

        if (empty($orderID)) {
            $response['message'] = 'Order ID is required.';
            echo json_encode($response);
            exit();
        }

        $mysqli->begin_transaction();

        try {
            // Delete from order_meals 
            $stmt_meals = $mysqli->prepare("DELETE FROM Order_Meals WHERE orderID = ?");
            $stmt_meals->bind_param("i", $orderID);
            if (!$stmt_meals->execute()) {
                throw new Exception('Failed to delete meal orders: ' . $stmt_meals->error);
            }
            $stmt_meals->close();

            // Delete from orders 
            $stmt_order = $mysqli->prepare("DELETE FROM Orders WHERE orderID = ?");
            $stmt_order->bind_param("i", $orderID);
            if (!$stmt_order->execute()) {
                throw new Exception('Failed to delete order: ' . $stmt_order->error);
            }
            $stmt_order->close();

            $mysqli->commit();
            $response['success'] = true;
            $response['message'] = 'Order deleted successfully!';

        } catch (Exception $e) {
            $mysqli->rollback();
            $response['message'] = $e->getMessage();
        }
    }
    // updateOrderItems {orderID, mealID, quantity} - adds to quantity or inserts new item and recalculates total
    else if ($action === 'updateOrderItems') {
        $orderID = $input['orderID'] ?? '';
        $mealID = $input['mealID'] ?? '';
        $quantity = $input['quantity'] ?? ''; 

        if (empty($orderID) || empty($mealID) || empty($quantity) || !is_numeric($orderID) || !is_numeric($mealID) || !is_numeric($quantity) || $quantity <= 0) {
            $response['message'] = 'Order ID, Meal ID, and a positive Quantity are required for updating order items.';
            echo json_encode($response);
            exit();
        }

        $mysqli->begin_transaction();

        try {
            //  Check if the meal already exists in Order_Meals 
            $current_meal_qty = 0;
            $stmt_check = $mysqli->prepare("SELECT quantity FROM Order_Meals WHERE orderID = ? AND mealID = ?");
            $stmt_check->bind_param("ii", $orderID, $mealID);
            $stmt_check->execute();
            $stmt_check->bind_result($current_meal_qty);
            $stmt_check->fetch();
            $stmt_check->close();

            if ($current_meal_qty > 0) {
                // Update existing quantity
                $stmt_update_meal = $mysqli->prepare("UPDATE Order_Meals SET quantity = quantity + ? WHERE orderID = ? AND mealID = ?");
                $stmt_update_meal->bind_param("iii", $quantity, $orderID, $mealID);
                if (!$stmt_update_meal->execute()) {
                    throw new Exception('Failed to update meal quantity in order: ' . $stmt_update_meal->error);
                }
                $stmt_update_meal->close();
            } else {
                // Insert new meal to order
                $stmt_insert_meal = $mysqli->prepare("INSERT INTO Order_Meals (orderID, mealID, quantity) VALUES (?, ?, ?)");
                $stmt_insert_meal->bind_param("iii", $orderID, $mealID, $quantity);
                if (!$stmt_insert_meal->execute()) {
                    throw new Exception('Failed to add new meal to order: ' . $stmt_insert_meal->error);
                }
                $stmt_insert_meal->close();
            }

            // update the total for the order
            $new_total = 0;
            $tax_rate = 0.10; 

            $stmt_get_prices = $mysqli->prepare("
                SELECT SUM(om.quantity * m.price) AS subtotal
                FROM Order_Meals om
                JOIN Meals m ON om.mealID = m.mealID
                WHERE om.orderID = ?
            ");
            $stmt_get_prices->bind_param("i", $orderID);
            $stmt_get_prices->execute();
            $result_prices = $stmt_get_prices->get_result();
            $row_prices = $result_prices->fetch_assoc();
            $subtotal = $row_prices['subtotal'] ?? 0;
            $stmt_get_prices->close();

            $new_total = $subtotal * (1 + $tax_rate);

            $stmt_update_order_total = $mysqli->prepare("UPDATE Orders SET total = ? WHERE orderID = ?");
            $stmt_update_order_total->bind_param("di", $new_total, $orderID);
            if (!$stmt_update_order_total->execute()) {
                throw new Exception('Failed to update order total: ' . $stmt_update_order_total->error);
            }
            $stmt_update_order_total->close();

            $mysqli->commit();
            $response['success'] = true;
            $response['message'] = 'Order items and total updated successfully!';
            $response['orderID'] = $orderID;
            $response['newTotal'] = $new_total;

        } catch (Exception $e) {
            $mysqli->rollback();
            $response['message'] = $e->getMessage();
        }
    }
    else {
        $response['message'] = 'Invalid action specified for POST request.';
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    // getOrders {customerID, staffID}
    if ($action === 'getOrders') {
        $customerID = $_GET['customerID'] ?? null;
        $staffID = $_GET['staffID'] ?? null;

        $query = "SELECT o.orderID, o.type, o.tableNo, o.status, o.orderTimestamp, o.total, o.customerID, o.staffID,
                         c.name AS customerName, c.email AS customerEmail, c.phoneNumber AS customerPhone, c.address AS customerAddress,
                         s.name AS staffName,
                         ct.name AS contactName, ct.phone AS contactPhone, ct.email AS contactEmail, ct.address AS contactAddress
                  FROM Orders o
                  LEFT JOIN Customers c ON o.customerID = c.customerID
                  LEFT JOIN Staff s ON o.staffID = s.staffID
                  LEFT JOIN Contact ct ON o.orderID = ct.orderID"; 

        $where_clauses = [];
        $bind_types = '';
        $bind_values = [];

        if ($customerID !== null) {
            $where_clauses[] = "o.customerID = ?";
            $bind_types .= 'i';
            $bind_values[] = $customerID;
        }
        if ($staffID !== null) {
            $where_clauses[] = "o.staffID = ?";
            $bind_types .= 'i';
            $bind_values[] = $staffID;
        }

        if (count($where_clauses) > 0) {
            $query .= " WHERE " . implode(" AND ", $where_clauses);
        }

        $query .= " ORDER BY o.orderTimestamp DESC";

        $stmt = $mysqli->prepare($query);

        if (count($bind_values) > 0) {
            $stmt->bind_param($bind_types, ...$bind_values);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $orders = [];
        while ($row = $result->fetch_assoc()) {
            // Fetch meals for each order
            $meal_query = "SELECT om.mealID, om.quantity, m.name, m.price, m.category, m.description
                           FROM Order_Meals om
                           JOIN Meals m ON om.mealID = m.mealID
                           WHERE om.orderID = ?";
            $stmt_meals = $mysqli->prepare($meal_query);
            $stmt_meals->bind_param("i", $row['orderID']);
            $stmt_meals->execute();
            $meal_result = $stmt_meals->get_result();
            $meals = [];
            while ($meal_row = $meal_result->fetch_assoc()) {
                $meals[] = $meal_row;
            }
            $stmt_meals->close();
            $row['items'] = $meals;

            if ($row['type'] === 'Online' && $row['contactName'] !== null) {
                $row['onlineOrderDetails'] = [
                    'customerName' => $row['contactName'],
                    'customerEmail' => $row['contactEmail'],
                    'customerPhone' => $row['contactPhone'],
                    'shippingAddress' => $row['contactAddress'],
                ];
            } else {
                // Ensure onlineOrderDetails is an empty array or null if not an online order or no contact info
                $row['onlineOrderDetails'] = null;
            }
            $orders[] = $row;
        }

        $response['success'] = true;
        $response['orders'] = $orders;
        $stmt->close();
    }
    // NEW: getUncompletedOrderByTable {tableNo}
    else if ($action === 'getUncompletedOrderByTable') {
        $tableNo = $_GET['tableNo'] ?? null;
        $customerID = $_GET['customerID'] ?? null;

        if (empty($tableNo) && empty($customerID)) {
            $response['message'] = 'Either Table number or Customer ID is required.';
            echo json_encode($response);
            exit();
        }

        $query = "SELECT orderID, status FROM Orders WHERE status NOT IN ('Completed', 'Cancelled')";
        $bind_types = "";
        $bind_values = [];

        if (!empty($tableNo)) {
            $query .= " AND tableNo = ?";
            $bind_types .= "s";
            $bind_values[] = $tableNo;
        }

        if (!empty($customerID)) {
            $query .= " AND customerID = ?";
            $bind_types .= "i";
            $bind_values[] = $customerID;
        }
        
        $query .= " ORDER BY orderTimestamp DESC LIMIT 1";

        $stmt = $mysqli->prepare($query);
        if (!empty($bind_values)) {
            $stmt->bind_param($bind_types, ...$bind_values);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $order = $result->fetch_assoc();
            $response['success'] = true;
            $response['order'] = $order;
        } else {
            $response['message'] = 'No uncompleted order found for the specified criteria.';
            $response['success'] = false;
        }
        $stmt->close();
    }
    else {
        $response['message'] = 'Invalid action specified for GET request.';
    }
} else {
    $response['message'] = 'Invalid request method.';
}

$mysqli->close();
echo json_encode($response);
?>

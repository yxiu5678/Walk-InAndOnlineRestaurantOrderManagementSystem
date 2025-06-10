<?php
require_once 'config.php'; 

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? ''; // 'login' or 'register'

    // login {email, password, role} -> response user info

    if ($action === 'login') {
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? '';

        if (empty($email) || empty($password) || empty($role)) {
            $response['message'] = 'Email, password, and role are required for login.';
            echo json_encode($response);
            exit();
        }

        $table = '';
        $id_column = '';
        $select_columns = ''; // Columns to fetch for the selected role

        if ($role === 'customer') {
            $table = 'Customers';
            $id_column = 'customerID';
            $select_columns = 'customerID, name, email, password, phoneNumber, address';
        } elseif ($role === 'staff') {
            $table = 'Staff';
            $id_column = 'staffID';
            $select_columns = 'staffID, name, email, password'; // Adjust based on actual Staff table
        } else {
            $response['message'] = 'Invalid role.';
            echo json_encode($response);
            exit();
        }

        $stmt = $mysqli->prepare("SELECT " . $select_columns . " FROM " . $table . " WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            // Verify password
            if (password_verify($password, $user['password'])) {
                $response['success'] = true;
                $response['message'] = 'Login successful!';
                unset($user['password']); 
                $response['user'] = $user;
                $response['role'] = $role;
            } else {
                $response['message'] = 'Invalid password.';
            }
        } else {
            $response['message'] = 'User not found.';
        }
        $stmt->close();

    
    } 
    // register {name, email, password, [phoneNumber, address], role} -> response success/failure
    elseif ($action === 'register') {
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $phoneNumber = $input['phoneNumber'] ?? '';
        $address = $input['address'] ?? '';
        $role = $input['role'] ?? '';

        if (empty($name) || empty($email) || empty($password) || empty($role)) {
            $response['message'] = 'Name, email, password, and role are required for registration.';
            echo json_encode($response);
            exit();
        }

        $table = '';
        $insert_columns = '';
        $bind_types = '';
        $bind_values = [];

        if ($role === 'customer') {
            $table = 'Customers';
            $insert_columns = 'name, email, password, phoneNumber, address';
            $bind_types = 'sssss';
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $bind_values = [$name, $email, $hashed_password, $phoneNumber, $address];
        } elseif ($role === 'staff') {
            $table = 'Staff';
            $insert_columns = 'name, email, password';
            $bind_types = 'sss';
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $bind_values = [$name, $email, $hashed_password];
        } else {
            $response['message'] = 'Invalid role.';
            echo json_encode($response);
            exit();
        }

        $stmt_check = $mysqli->prepare("SELECT email FROM " . $table . " WHERE email = ?");
        $stmt_check->bind_param("s", $email);
        $stmt_check->execute();
        $stmt_check->store_result();
        if ($stmt_check->num_rows > 0) {
            $response['message'] = 'User with this email already exists.';
            $stmt_check->close();
            echo json_encode($response);
            exit();
        }
        $stmt_check->close();

        // Insert new user
        $placeholders = implode(', ', array_fill(0, count($bind_values), '?'));
        $stmt_insert = $mysqli->prepare("INSERT INTO " . $table . " (" . $insert_columns . ") VALUES (" . $placeholders . ")");
        $stmt_insert->bind_param($bind_types, ...$bind_values);

        if ($stmt_insert->execute()) {
            $response['success'] = true;
            $response['message'] = 'Registration successful!';
        } else {
            $response['message'] = 'Registration failed: ' . $mysqli->error;
        }
        $stmt_insert->close();

    } else {
        $response['message'] = 'Invalid action specified.';
    }
} else {
    $response['message'] = 'Invalid request method.';
}

$mysqli->close();
echo json_encode($response);
?>

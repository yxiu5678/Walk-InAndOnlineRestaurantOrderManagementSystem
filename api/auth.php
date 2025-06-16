<?php
require_once 'config.php'; 

header('Content-Type: application/json');

function refValues($arr) {
    if (strnatcmp(phpversion(), '5.3') >= 0) {
        $refs = [];
        foreach ($arr as $key => $value) {
            $refs[$key] = &$arr[$key];
        }
        return $refs;
    }
    return $arr;
}

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
    else if ($action === 'register') {
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $name = $input['name'] ?? '';
        $role = $input['role'] ?? ''; // Should be 'customer' for this flow
    
        if (empty($email) || empty($password) || empty($name) || empty($role)) {
            $response['message'] = 'Name, email, password, and role are required for registration.';
            echo json_encode($response);
            exit();
        }
    
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
        if ($role === 'customer') {
            $phoneNumber = $input['phoneNumber'] ?? null; // NEW: Get phone number for customer
            $address = $input['address'] ?? null; // If you have an address field in your DB
            $table = 'Customers';
            $insert_columns = 'name, email, password, phoneNumber'; // Include phoneNumber
            $placeholders = '?, ?, ?, ?';
            $bind_types = 'ssss'; // String for name, email, password, phoneNumber
            $bind_values = [$name, $email, $hashed_password, $phoneNumber]; // Include phoneNumber
    
            // Check if email already exists
            $stmt_check = $mysqli->prepare("SELECT customerID FROM Customers WHERE email = ?");
            $stmt_check->bind_param("s", $email);
            $stmt_check->execute();
            $stmt_check->store_result();
            if ($stmt_check->num_rows > 0) {
                $response['message'] = 'Email already registered.';
                echo json_encode($response);
                exit();
            }
            $stmt_check->close();
    
        } elseif ($role === 'staff') {
            // Staff registration (if you allow it via a similar form)
            $table = 'Staff';
            $insert_columns = 'name, email, password';
            $placeholders = '?, ?, ?';
            $bind_types = 'sss';
            $bind_values = [$name, $email, $hashed_password];
    
            // Check if email already exists
            $stmt_check = $mysqli->prepare("SELECT staffID FROM Staff WHERE email = ?");
            $stmt_check->bind_param("s", $email);
            $stmt_check->execute();
            $stmt_check->store_result();
            if ($stmt_check->num_rows > 0) {
                $response['message'] = 'Email already registered.';
                echo json_encode($response);
                exit();
            }
            $stmt_check->close();
    
        } else {
            $response['message'] = 'Invalid role for registration.';
            echo json_encode($response);
            exit();
        }
    
        $query = "INSERT INTO " . $table . " (" . $insert_columns . ") VALUES (" . $placeholders . ")";
        $stmt = $mysqli->prepare($query);
    
        if ($stmt === false) {
            $response['message'] = 'Prepare failed: ' . $mysqli->error;
            echo json_encode($response);
            exit();
        }

        call_user_func_array([$stmt, 'bind_param'], refValues(array_merge([$bind_types], $bind_values)));
    
        if ($stmt->execute()) {
            $response['success'] = true;
            $response['message'] = ucfirst($role) . ' registered successfully!';
        } else {
            $response['message'] = 'Registration failed: ' . $stmt->error;
        }
        $stmt->close();
    }
    elseif ($action === 'updateProfile') {
        $role = $input['role'] ?? '';
        $id = $input['customerID'] ?? ($input['staffID'] ?? null); // Adjust to get the correct ID
        $name = $input['name'] ?? null;
        $phoneNumber = $input['phoneNumber'] ?? null;
        $address = $input['address'] ?? null;
        $password = $input['password'] ?? null; // If password can be updated
        $email = $input['email'] ?? null;
        $password = $input['password'] ?? null;
        $table = '';
        $id_column = '';
        $update_fields = [];
        $bind_types = "";
        $bind_values = [];
    
        if ($role === 'customer') {
            $table = 'Customers';
            $id_column = 'customerID';
            if ($name !== null) {
                $update_fields[] = 'name = ?';
                $bind_types .= 's';
                $bind_values[] = $name;
            }
            if ($phoneNumber !== null) {
                $update_fields[] = 'phoneNumber = ?';
                $bind_types .= 's';
                $bind_values[] = $phoneNumber;
            }
            if ($address !== null) {
                $update_fields[] = 'address = ?';
                $bind_types .= 's';
                $bind_values[] = $address;
            }
            if ($email !== null) {
                $update_fields[] = 'email = ?';
                $bind_types .= 's';
                $bind_values[] = $email;
            }
            if ($password !== null) { // Check if password is provided in the input
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $update_fields[] = 'password = ?';
                $bind_types .= 's';
                $bind_values[] = $hashed_password;
            }

            // Add more fields if they can be updated for customers
        } elseif ($role === 'staff') {
            $table = 'Staff';
            $id_column = 'staffID';
            if ($name !== null) {
                $update_fields[] = 'name = ?';
                $bind_types .= 's';
                $bind_values[] = $name;
            }
            if ($email !== null) {
                $update_fields[] = 'email = ?';
                $bind_types .= 's';
                $bind_values[] = $email;
            }
            if ($password !== null) { // Check if password is provided in the input
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $update_fields[] = 'password = ?';
                $bind_types .= 's';
                $bind_values[] = $hashed_password;
            }
            
        } else {
            $response['message'] = 'Invalid role.';
            echo json_encode($response);
            exit();
        }
    
        if (empty($update_fields) || $id === null) {
            $response['message'] = 'No valid fields to update or ID is missing.';
            echo json_encode($response);
            exit();
        }
    
        $query = "UPDATE " . $table . " SET " . implode(', ', $update_fields) . " WHERE " . $id_column . " = ?";
        $bind_types .= 'i'; // Assuming ID is an integer
        $bind_values[] = $id;
    
        $stmt = $mysqli->prepare($query);
        if ($stmt === false) {
            $response['message'] = 'Prepare failed: ' . $mysqli->error;
            echo json_encode($response);
            exit();
        }
    
        $stmt->bind_param($bind_types, ...$bind_values);
    
        if ($stmt->execute()) {
            $response['success'] = true;
            $response['message'] = ucfirst($role) . ' profile updated successfully!';
        } else {
            $response['message'] = 'Profile update failed: ' . $stmt->error;
        }
        $stmt->close();
    }
    
    else {
        $response['message'] = 'Invalid action specified.';
    }
} else {
    $response['message'] = 'Invalid request method.';
}

$mysqli->close();
echo json_encode($response);
?>

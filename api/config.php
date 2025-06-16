<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

define('DB_HOST', 'localhost');
define('DB_USER', 'root'); 
define('DB_PASS', '');  
define('DB_NAME', 'az_kitchen_db'); 

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection failed: " . $mysqli->connect_error]);
    exit();
}

$mysqli->set_charset("utf8mb4");

?>
<?php
// config.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // 你的MySQL用户名，XAMPP默认是root
define('DB_PASS', '');     // 你的MySQL密码，XAMPP默认是空
define('DB_NAME', 'az_kitchen_db'); // 你的数据库名称

// 创建MySQLi连接
$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// 检查连接是否成功
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection failed: " . $mysqli->connect_error]);
    exit();
}

// 设置字符集，推荐使用 utf8mb4
$mysqli->set_charset("utf8mb4");

?>
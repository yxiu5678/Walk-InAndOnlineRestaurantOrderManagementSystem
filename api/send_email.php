<?php
// send_email.php
require_once 'config.php';
require '../libs/PHPMailer-6.10.0/src/PHPMailer.php';
require '../libs/PHPMailer-6.10.0/src/SMTP.php';
require '../libs/PHPMailer-6.10.0/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP; // Added this for SMTP::DEBUG_SERVER

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $recipientEmail = $input['recipientEmail'] ?? '';
    $orderID = $input['orderID'] ?? '';
    $orderType = $input['orderType'] ?? '';
    $orderTotal = $input['orderTotal'] ?? '';
    $orderStatus = $input['orderStatus'] ?? '';
    $orderItems = $input['orderItems'] ?? []; // Array of {name, quantity, price}

    error_log("Recipient Email from payload: " . $recipientEmail);

    if (empty($recipientEmail) || empty($orderID) || empty($orderTotal) || empty($orderStatus)) {
        $response['message'] = 'Missing required email parameters.';
        echo json_encode($response);
        exit();
    }

    try {
        $mail = new PHPMailer(true); // Enable exceptions

        // Server settings
        $mail->isSMTP();                                            // Send using SMTP
        $mail->Host       = 'smtp.gmail.com';                       // Set the SMTP server to send through
        $mail->SMTPAuth   = true;                                   // Enable SMTP authentication
        $mail->Username   = 'uzj919@gmail.com';                 // SMTP username (YOUR GMAIL ADDRESS)
        $mail->Password   = 'vdtzfqllzqjvdylg';                    // SMTP password (YOUR GMAIL APP PASSWORD)
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;            // Enable implicit TLS encryption
        $mail->Port       = 465;                                    // TCP port to connect to; use 587 if you set `SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS`

        // Optional: for debugging
        // $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Enable verbose debug output (turn off in production)

        // Recipients
        $mail->setFrom('uzj919@gmail.com', 'AZ Kitchen'); // Sender Email and Name
        $mail->addAddress($recipientEmail);                       // Add a recipient (Customer's email)
        $mail->addReplyTo('uzj919@gmail.com', 'No-Reply'); // Optional: Reply-to address

        // Content
        $mail->isHTML(true);                                  // Set email format to HTML
        $mail->Subject = 'AZ Kitchen - Order Confirmation #' . $orderID;

        // Build the email body
        $emailBody = "
            <!DOCTYPE html>
            <html lang='en'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Order Confirmation</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                        -webkit-text-size-adjust: none; /* For iOS */
                        text-size-adjust: none; /* For Android */
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header {
                        background-color: #4CAF50; /* A pleasant green */
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                        font-size: 24px;
                    }
                    .content {
                        padding: 20px 30px;
                        line-height: 1.6;
                        color: #333333;
                    }
                    .content h2 {
                        color: #4CAF50;
                        margin-bottom: 15px;
                    }
                    .content p {
                        margin-bottom: 10px;
                    }
                    .order-details {
                        margin: 25px 0;
                        border-collapse: collapse;
                        width: 100%;
                    }
                    .order-details th, .order-details td {
                        border: 1px solid #dddddd;
                        text-align: left;
                        padding: 10px;
                    }
                    .order-details th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .total {
                        font-size: 18px;
                        font-weight: bold;
                        text-align: right;
                        margin-top: 20px;
                        color: #4CAF50;
                    }
                    .footer {
                        background-color: #f2f2f2;
                        color: #666666;
                        padding: 15px;
                        text-align: center;
                        font-size: 12px;
                        border-top: 1px solid #eeeeee;
                    }
                </style>
            </head>
            <body>
                <div class='email-container'>
                    <div class='header'>
                        Order Confirmation
                    </div>
                    <div class='content'>
                        <p>Dear Customer,</p>
                        <p>Thank you for your order with AZ Kitchen!</p>
                        <p>Your order details are as follows:</p>
                        <p><strong>Order ID:</strong> " . htmlspecialchars($orderID) . "</p>
                        <p><strong>Order Type:</strong> " . htmlspecialchars($orderType) . "</p>
                        <p><strong>Order Status:</strong> " . htmlspecialchars($orderStatus) . "</p>

                        <div class='order-items'>
                            <h2>Order Items</h2>
                            <table class='order-details'>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Quantity</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody>";

        foreach ($orderItems as $item) {
            $emailBody .= "
                                    <tr>
                                        <td>" . htmlspecialchars($item['name']) . "</td>
                                        <td>" . htmlspecialchars($item['quantity']) . "</td>
                                        <td>RM " . number_format($item['price'], 2) . "</td>
                                    </tr>";
        }

        $emailBody .= "
                                </tbody>
                            </table>
                        </div>

                        <p class='total'>Total Amount: RM " . number_format($orderTotal, 2) . "</p>

                        <p>We will notify you once your order is ready for pickup or delivery.</p>
                        <p>If you have any questions, please do not hesitate to contact us.</p>
                        <p>Sincerely,</p>
                        <p>The AZ Kitchen Team</p>
                    </div>
                    <div class='footer'>
                        <p>&copy; " . date('Y') . " AZ Kitchen. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        ";

        $mail->Body    = $emailBody;
        $mail->AltBody = 'Your order confirmation from AZ Kitchen. Order ID: ' . $orderID . ', Total: RM' . number_format($orderTotal, 2) . '. Please check the HTML version for full details.';

        $mail->send();
        $response['success'] = true;
        $response['message'] = 'Order confirmation email sent successfully!';
    } catch (Exception $e) {
        $response['message'] = "Failed to send email. Mailer Error: {$mail->ErrorInfo}";
        // Log the error for debugging: error_log("Mailer Error: {$mail->ErrorInfo}");
    }
    // Echo the JSON response for all cases within the POST request
    echo json_encode($response);
} else {
    $response['message'] = 'Invalid request method.';
    echo json_encode($response);
}
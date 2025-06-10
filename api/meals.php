<?php
require_once 'config.php'; 

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $input_json = file_get_contents('php://input');
    $input_data = json_decode($input_json, true); 

    $action = $input_data['action'] ?? $_POST['action'] ?? ''; 

    // addMeal {name, category, price, description, image} -> request meal details with image, response success message
    if ($action === 'addMeal') {
        $name = $_POST['name'] ?? '';
        $category = $_POST['category'] ?? '';
        $price = $_POST['price'] ?? '';
        $description = $_POST['description'] ?? '';

        if (empty($name) || empty($category) || empty($price)) {
            $response['message'] = 'Meal name, category, and price are required.';
            echo json_encode($response);
            exit();
        }

        // Handle image upload
        $image_data = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $image_tmp_name = $_FILES['image']['tmp_name'];
            $image_data = file_get_contents($image_tmp_name); // Get image data
        } else {
            $response['message'] = 'Image upload failed or no image was provided.';
            echo json_encode($response);
            exit();
        }

        // Insert meal data into database
        $stmt = $mysqli->prepare("INSERT INTO Meals (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdsb", $name, $category, $price, $description, $image_data);
        $null = NULL;
        $stmt->send_long_data(4, $image_data); // Send image data as blob

        if ($stmt->execute()) {
            $response['success'] = true;
            $response['message'] = 'Meal added successfully!';
        } else {
            $response['message'] = 'Failed to add meal: ' . $stmt->error;
        }
        $stmt->close();

    // getMeals {} -> request nothing, response meal list (no images)
    } else if ($action === 'getMeals') {
        $meals = [];
        $result = $mysqli->query("SELECT mealID, name, category, price, description FROM Meals"); // Avoid large image data

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $meals[] = $row;
            }
            $response['success'] = true;
            $response['meals'] = $meals;
        } else {
            $response['message'] = 'Failed to fetch meals: ' . $mysqli->error;
        }
    } else {
        $response['message'] = 'Invalid action specified for POST request.';
    }

} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    // getMealImage {mealID} -> request meal ID, response image file (jpeg)
    if ($action === 'getMealImage') {
        $mealID = $_GET['mealID'] ?? ''; 
        
        if (empty($mealID)) {
            $response['message'] = 'Meal ID is required to fetch image.';
            echo json_encode($response);
            exit();
        }

        $stmt = $mysqli->prepare("SELECT image FROM Meals WHERE mealID = ?");
        $stmt->bind_param("i", $mealID);
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($image);
        $stmt->fetch();

        if ($image) {
            header('Content-Type: image/jpeg'); // Output image directly
            echo $image;
            exit(); 
        } else {
            $response['message'] = 'Image not found for this meal.';
            echo json_encode($response); 
        }
        $stmt->close();
        exit(); 
    } else {
        $response['message'] = 'Invalid action specified for GET request.';
    }
} else {
    $response['message'] = 'Invalid request method.';
}

$mysqli->close();
echo json_encode($response);
?>

import cv2


def preprocess_image(image_path):
  # Read the image
  img = cv2.imread(image_path)
    
  # Convert to grayscale
  gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
  
  # Apply Gaussian blur
  blur = cv2.GaussianBlur(gray, (5, 5), 0)
  
  # Apply binary thresholding
  _, thresholded = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
  
  # Save the preprocessed image
  cv2.imwrite('preprocessed_image.jpg', blur)


# Use the function on an image file
preprocess_image('test2.jpg')

import numpy as np
import cv2
from PIL import Image, ImageEnhance, ImageOps

def simple_enhance():
    # Open the image file
    img = Image.open("test1.jpg")

    # Convert the image to grayscale
    bw_img = ImageOps.grayscale(img)

    # Enhance the contrast to the maximum
    enhancer = ImageEnhance.Contrast(bw_img)
    max_contrast_img = enhancer.enhance(2.0)  # Assuming maximum contrast as twice the normal

    #sharpened_img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))


    max_contrast_img.save('output.jpg')


img = simple_enhance()

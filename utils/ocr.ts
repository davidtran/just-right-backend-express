import axios from 'axios';
import { createReadStream } from 'fs';
import FormData from 'form-data';

export async function parseImage(imagePath: string, filename: string) {
  const data = new FormData();
  const file = createReadStream(imagePath);  
  if (file) {
    data.append('image_type', 'mixed'); // "mixed": Mixed image; "formula": Pure formula image; "text": Pure text image
    data.append('resized_shape', '768'); // Effective only when image_type=="mixed"      
    data.append('image', file);
  
    const request_config = {
      method: 'post',
      url: process.env.PIX2TEXT_ENDPOINT,
      headers: {    
        'Content-Type': 'multipart/form-data',
      },
      data: data,
    };
  
    const res = await axios.request(request_config);    
    return res.data.results;
  }
  
}

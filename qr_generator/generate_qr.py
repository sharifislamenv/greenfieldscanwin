# D:\MyProjects\greenfield-scanwin\qr_generator\generate_qr.py

import os
import qrcode
import uuid
import csv
import io # Import io for in-memory file handling
from supabase import create_client
from dotenv import load_dotenv
import hmac
import hashlib

load_dotenv()

# Define the local directory where QR codes will be saved
LOCAL_QR_SAVE_DIR = "generated_qrs" # New directory for local saves

def generate_qr(store_id, banner_id, item_id, lat, lng, campaign_id=None):
    # Generate unique ID for the QR code
    unique_id = str(uuid.uuid4())
    secret_key = os.getenv("HMAC_SECRET").encode()

    # CRITICAL HMAC INTEGRITY FIX: Include unique_id in the data that is signed.
    data_to_sign = f"{store_id}|{banner_id}|{item_id}|{lat}|{lng}|{unique_id}"
    #-----------------

    # --- ADD THESE TWO LINES FOR DEBUGGING ---
    print("--- PYTHON (GENERATION) ---")
    print(f"DATA TO SIGN: '{data_to_sign}'")
    print(f"SECRET KEY: '{secret_key.decode()}'") # Use .decode() to print the string
    
    # ------------------------------------------

    #-----------------
    signature = hmac.new(secret_key, data_to_sign.encode(), hashlib.sha256).hexdigest()

    # The data embedded in the QR code URL, including the signed payload and signature.
    
    #---------------------------------------
    print(f"PYTHON's Signature: {signature}")
    #---------------------------------------
    
    signed_data_for_qr = f"{data_to_sign}|{signature}"

    # Create QR Code object
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(f"https://greenfieldscanwin.vercel.app/scan?d={signed_data_for_qr}")
    img = qr.make_image(fill_color="#2ecc71", back_color="white")

    # Initialize Supabase client
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

    # --- RESOLUTION: Save QR code image to local server ---
    # Ensure the local directory exists
    if not os.path.exists(LOCAL_QR_SAVE_DIR):
        os.makedirs(LOCAL_QR_SAVE_DIR)
    
    local_filename = os.path.join(LOCAL_QR_SAVE_DIR, f"qr_{unique_id}.png")
    img.save(local_filename) # Save image locally
    print(f"QR code saved locally: {local_filename}")

    # Save image to an in-memory buffer for Supabase upload
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG') # Save image to buffer as PNG format
    img_buffer.seek(0) # Rewind the buffer to the beginning

    filename_for_storage = f"qr_{unique_id}.png"

    # --- RESOLUTION: Updated bucket name to "qr-codes2" ---
    # Upload to Supabase Storage in the specified bucket
    #supabase.storage.from_("qr-codes2").upload(filename_for_storage, img_buffer.getvalue())
    supabase.storage.from_("qr-codes2").upload(filename_for_storage, img_buffer.getvalue(), {"Content-Type": "image/png"})
    print(f"QR code uploaded to Supabase bucket: qr-codes2/{filename_for_storage}")

    # Store metadata in DB
    supabase.table("qr_codes").insert({
        "id": unique_id,
        "store_id": store_id,
        "banner_id": banner_id,
        "item_id": item_id,
        "location": f"POINT({lng} {lat})",
        "campaign_id": campaign_id
    }).execute()

    print(f"Metadata stored in DB for QR ID: {unique_id}")
    return local_filename # Return local path for confirmation

# Load store data from CSV and generate QR codes
# Ensure you are running this script from the project root directory (cd ..)
# so it can find your .env file
with open('qr_generator/stores.csv') as csvfile: # Adjusted path for running from root
    reader = csv.DictReader(csvfile)
    for row in reader:
        generate_qr(
            int(row['store_id']),
            int(row['banner_id']),
            int(row['item_id']),
            float(row['lat']),
            float(row['lng']),
            int(row.get('campaign_id', 0))  # Optional campaign ID
        )
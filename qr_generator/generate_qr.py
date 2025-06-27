# D:\MyProjects\greenfield-scanwin\qr_generator\generate_qr.py

import os
import qrcode
import uuid
import csv
import io
from supabase import create_client, Client 
from dotenv import load_dotenv
import hmac
import hashlib

# Load environment variables from the .env file in the project root
load_dotenv()

# Define the local directory where QR codes will be saved
LOCAL_QR_SAVE_DIR = "generated_qrs"

# Main function to generate a single QR code
def generate_qr(store_id, banner_id, item_id, lat, lng, supabase_client: Client, campaign_id=None):
    """
    Generates a single QR code, saves it locally, uploads it to Supabase, 
    and stores its metadata.
    """
    unique_id = str(uuid.uuid4())
    secret_key = os.getenv("HMAC_SECRET").encode('utf-8')
    data_to_sign = f"{store_id}|{banner_id}|{item_id}|{lat}|{lng}|{unique_id}"
    signature = hmac.new(secret_key, data_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    signed_data_for_qr = f"{data_to_sign}|{signature}"
    
    print("\n--- Generating New QR Code ---")
    print(f"Data to sign: {data_to_sign}")
    print(f"Secret key: {secret_key.decode()}")
    print(f"Generated signature: {signature}")

    # Create QR Code image object
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=8,
    )
    qr.add_data(f"https://greenfieldscanwin.vercel.app/scan?d={signed_data_for_qr}")
    # img = qr.make_image(fill_color="#2ecc71", back_color="white")
    img = qr.make_image()

    # --- ADDED BACK: Save a local copy of the QR code ---
    # Ensure the local directory exists
    if not os.path.exists(LOCAL_QR_SAVE_DIR):
        os.makedirs(LOCAL_QR_SAVE_DIR)
    
    local_filename = os.path.join(LOCAL_QR_SAVE_DIR, f"qr_{unique_id}.png")
    img.save(local_filename)
    print(f"QR code saved locally to: {local_filename}")
    # ---------------------------------------------------

    # Generate image in memory for direct upload
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)

    filename_for_storage = f"qr_{unique_id}.png"
    
    # Upload to Supabase Storage
    supabase_client.storage.from_("qr-codes2").upload(
        filename_for_storage, 
        img_buffer.getvalue(), 
        {"content-type": "image/png"}
    )
    print(f"Uploaded to Supabase: qr-codes2/{filename_for_storage}")

    # Store metadata in the database
    supabase_client.table("qr_codes").insert({
        "id": unique_id,
        "store_id": store_id,
        "banner_id": banner_id,
        "item_id": item_id,
        "location": f"POINT({lng} {lat})",
        "campaign_id": campaign_id
    }).execute()

    print(f"Metadata stored in DB for QR ID: {unique_id}")

# --- Main script execution block ---
if __name__ == "__main__":
    try:
        # Initialize the Supabase client ONCE here
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

        # Define the path to the CSV file relative to the project root
        csv_path = 'qr_generator/stores.csv'
        print(f"🔷 Reading data from '{csv_path}' and generating QR codes...")
        
        with open(csv_path) as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                generate_qr(
                    store_id=int(row['store_id']),
                    banner_id=int(row['banner_id']),
                    item_id=int(row['item_id']),
                    lat=float(row['lat']),
                    lng=float(row['lng']),
                    campaign_id=int(row.get('campaign_id', 0)),
                    supabase_client=supabase 
                )
        
        print("\n🎉 All QR codes processed successfully.")

    except Exception as e:
        print(f"\n💥 An error occurred: {e}")
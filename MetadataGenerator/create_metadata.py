import os
import datetime

def create_metadata_file(folder_path):
    # Iterate through all files in the folder
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)

        # Define allowed extensions for photos and videos
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
                      '.mp4', '.mov', '.avi', '.mkv', '.wmv'}
        
        # Check if it's a file (not a folder)
        if os.path.isfile(file_path):
            _, ext = os.path.splitext(file_path)
        if ext.lower() in allowed_extensions:
            print(f"{file_path} is a photo or video file.")

            # Get file metadata
            file_size = os.path.getsize(file_path)
            file_modified_time = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
            file_created_time = datetime.datetime.fromtimestamp(os.path.getctime(file_path))
            
            # Create metadata text file
            metadata_filename = f"{filename}.txt"
            metadata_file_path = os.path.join(folder_path, metadata_filename)
            
            print(f"Metadata file {metadata_file_path} created successfully!")
            if not os.path.exists(metadata_file_path):
                with open(metadata_file_path, 'w') as f:
                    #f.write(f"File Name: {filename}\n")
                    #f.write(f"File Size: {file_size} bytes\n")
                    #f.write(f"Modified Time: {file_modified_time}\n")
                    f.write(f"{file_created_time}\n")
        else:
            print(f"{file_path} is not a photo or video file.")

if __name__ == "__main__":
    folder_path = "/app/data"
    create_metadata_file(folder_path)
    print("Metadata files created successfully!")
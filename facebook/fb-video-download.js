/**
 * Download Facebook video (December 2022).
 * 
 * 1. Open the Facebook video you want to download.
 * 2. Edit the address bar and replace "www.facebook..." with "m.facebook..." and press Enter.
 * 3. Open the developer console by:
 *    F12,  
 *    or Ctrl + Shift + I, or Cmd + Opt + I, 
 *    or Ctrl + Shift + C, or Cmd + Opt + C.
 *    or right-click on the page and select "Inspect".
 * 4. Click on the video to play it (then you can click again for pause).
 * 5. Copy and paste (Ctrl + V) the code below into the console and press Enter.
 * 
 * Reference: https://youtu.be/Ogt23VPBuQ8
 */

document.querySelectorAll("video").forEach((video, index) => {
    // Remove the blob: prefix from the video URL
    const videoURL = video.src.replace("blob:", "");

    fetch(videoURL)
        .then(response => response.blob())
        .then(blob => {
            const blobURL = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = blobURL;
            downloadLink.style = "display: none";

            downloadLink.download = `FBVideo-${index + 1}`;
            document.body.appendChild(downloadLink);
            downloadLink.click();


            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(blobURL);
            }, 100);
        })
        .catch((error) => `Video fetch error: ${error}`);
});

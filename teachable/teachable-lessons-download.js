/**
 * Download LinkedIn Learning Courses.
 * 
 * The script requires 'dom-to-image.js'. It should be pasted in the browser's console along with the current script.
 * And will provide domtoimage() function that is used to downland the quizzes as .png files. 
 * It cannot be loaded as external script because the CORS of the site.
 * 
 * By default, the script will download all the videos and quizzes as .mp4 and .png files - one by one from the beginning.
 * It takes 5-6 seconds for each item to be processed, because I'v tried to handle relatively slow Internet connection wit long timeouts.
 * 
 * Once the script (and 'dom-to-image.js') are pasted in the console you can start the action by calling the function 'download()'.
 * 
 * The function 'download()' takes 3 optional parameters:
 * + startFromLesson: the first lesson to be downloaded.
 *      Default is 1. When the second param is set to 'false' (default), the script will scan all <li>st items and count them as lessons.
 * + single: if true, the script will download only one lesson.
 *      Default is false. In this case you must specify the lesson number in the first param.
 * + download: if 'all', the script will download all the videos and quizzes.
 *      Default is 'all'. When the second param is set to 'false' (default) you don't need to specify this value.
 *      If 'quizzes', the script will download only quizzes.
 *      If 'videos', the script will download only videos.
 * 
 * Examples of usage:
 *  download();                     // download all videos and quizzes from the beginning
 *  download(5);                    // download all videos and quizzes from the 5th lesson to the end
 *  download(5, false);             // same as the above
 *  download(5, true);              // download only the 5th lesson (video or quiz)
 *  download(1, false, 'quiz');     // download only quizzes from the 1st lesson to the end
 *  download(1, false, 'video');    // download only videos from the 1st lesson to the end
 * 
 * The videos are much easier to be handled, because quizzes have multiple pages and you must solve one question to view the next.
 * So probably you will want to: 1) download all videos by 'download(1, false, 'video');',
 * and then download manually the quizzes (if you need them), one by one, after solving each one - 'download(42, false);' (where 42 is the lesson number).
 */

// Load the html2pdf library, https://github.com/eKoopmans/html2pdf.js
function addScript(url) {
    var script = document.createElement("script");
    script.type = "application/javascript";
    script.src = url;
    document.head.appendChild(script);
}
addScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");

// The Lesson class whose instances does the job of downloading the videos and quizzes
class Lesson {
    constructor(lessonItem, courseName, lessonIndex, chaptersList) {
        this.lessonItem = lessonItem;
        this.courseName = courseName;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.fileExt = ".mp4";
        this.lessonType = "video";
        this.lessonIndex = lessonIndex;
        this.setData(chaptersList);
    }

    async setData(chaptersList = []) {
        const currentLesson = document.querySelector(".section-item.next-lecture");

        this.lessonTitle = currentLesson
            .querySelector(".lecture-name").innerText.replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1m$2s)").replace(/:/g, "-").replace(/\s+_*\s*/, " ").replace(/^\d+\-\s/, "").trim();

        this.chapterTitle = currentLesson.parentElement.parentElement
            .querySelector(".section-title").innerText.replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1h$2m)").replace(/:/g, "-").replace(/\s+_*\s*/, " ").trim();

        const currentChapter =  currentLesson.parentElement.parentElement;
        const currentChapterIndex = chaptersList.indexOf(currentChapter);

        const lessonsInCurrentChapter = currentLesson.parentElement.querySelectorAll("li");
        this.lessonNumber = Array.from(lessonsInCurrentChapter).indexOf(currentLesson) + 1;

        this.fileName = `${this.courseName} [${this.lessonIndex}] ${currentChapterIndex}. ${this.chapterTitle} ${this.lessonNumber}. ${this.lessonTitle}`;

        const thisDownloadLink = document.querySelector("a.download");

        if (thisDownloadLink) {
            this.lessonType = "video";
            this.fileExt = thisDownloadLink.dataset['xOriginDownloadName'].split(".").pop();
            this.fileName = `${this.fileName}.${this.fileExt}`;
            this.src = thisDownloadLink.href;
            console.log(this.fileName);

            await this.downloadResource();
        } else {
            this.lessonType = "quiz";
            this.fileName = `${this.fileName}.pdf`;
            this.src = document.querySelector('div[role=main].course-mainbar');
            console.log(this.fileName);

            await this.downloadScreenShot();
        }
    }

    async downloadResource() {
        return fetch(this.src)
            .then(response => response.blob())
            .then(blob => {
                const blobURL = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = blobURL;
                downloadLink.style = "display: none";

                downloadLink.download = this.fileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();

                return new Promise(resolve => {
                    setTimeout(() => {
                        document.body.removeChild(downloadLink);
                        resolve();
                    }, 3500);
                });
            })
            .catch((error) => `Video fetch error: ${error}`);
    }

    async downloadScreenShot() {
        return html2pdf().set({ "filename": this.fileName }).from(this.src).save().then(() => {
            return new Promise(resolve => {
                setTimeout(() => resolve(), 5500);
            });
        });
    }
}

// Get common data from the page
const courseName = document.querySelector(".course-sidebar-head > h2").innerText.replace(/\n.*$/, "").trim();
let chapters = document.querySelectorAll('.course-section');
let lessons = document.querySelectorAll('.course-section li.section-item');

function download(startFromLesson = 1, lessonsToDownload = null) {

    // Collect the data of the Lessons
    setTimeout(() => {
        chapters = document.querySelectorAll('.course-section');
        chapters = Array.from(chapters);
        lessons = document.querySelectorAll('.course-section li.section-item');
        lessons = Array.from(lessons);

        const lessonsNumber = lessons.length;

        lessons.splice(0, startFromLesson - 1);

        // Create a Video object for each lesson - collect information
        async function collectData() {
            for (const lesson of lessons) {
                // if (lessonsToDownload && !lessonsToDownload.includes(lessons.indexOf(lesson) + 1)) continue;
                lesson.querySelector('a').click();
                await new Promise(resolve => setTimeout(resolve(), 4000));
                const lessonIndex = `${(lessons.indexOf(lesson) + startFromLesson).toString().padStart(lessonsNumber.toString().length, "0")} - ${lessonsNumber}`;
                const lessonItem = new Lesson(lesson, courseName, lessonIndex, chapters);

                let timeout = 4000;
                if (lessonItem.lessonType === "quiz") timeout = 6000;
                await new Promise(resolve => setTimeout(resolve(), timeout));
            }
        }
        collectData();
    }, 1000);
}

// const lessonsToDownload = [198];
// download(1, lessonsToDownload);
download(183);
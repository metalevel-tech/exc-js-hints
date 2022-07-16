/**
 * Download Teachable Courses.
 * 
 * The script requires 'html2pdf.js'. It is loaded in the beginning of this script.
 * 
 * By default, the script will download all the videos and other downloadable resources.
 * If on there are not resources for download available the script will create a PDF by the help of html2pdf.js.
 * It takes about 15 seconds for each item to be processed, because I'v tried to handle relatively slow Internet connection wit long timeouts.
 * 
 * 
 * The function 'download()' takes 2 optional parameters:
 * > startFromLesson         - The first lesson to be downloaded. Default is 1. When the value is set to 0, the script will download only the current lesson.
 * > lessonsNumberToDownload - The number of the lessons to be downloaded. Default is null - which means no limit, or all.
 * > listOfLessonsToDownload - An array of the numbers of the lessons to be downloaded. Default is null - which means disabled.
 *                             If the array is not empty, the script will download only the lessons in the array.
 *                             Note if you need to download the first lesson you must set element with value 1 (not 0).
 *                             This parameter takes precedence over the 'lessonsNumberToDownload' and 'startFromLesson' parameters.
 * 
 * Examples of usage:
 *  download();                     // download all videos and/or other resources from the beginning
 *  download(1);                    // the same as the above...
 *  download(5);                    // download all videos and/or other resources from the 5th lesson to the end
 *  download(5, 3);                 // start from the 5th lesson and download 3 videos and/pr other resources
 *  download(5, 1);                 // download the resources for the the 5th lesson only
 *  download(1, 1, [3, 5, 7]);      // download the resources for the 3rd, 5th and 7th lesson only
 *  download(5, null, [7, 3, 5]);   // the same as the above...
 *  download(0);                    // get the current lesson only
 *  download(0, 2, [3, 5]);         // the same as the above...
 * 
 * Because the response of teachable's server sometime takes long time it is possible to have duplicated or/and missing lessons.
 * So you need to inspect the list of the downloaded resources, remove the duplicates and refetch the missing.
 */

// Load the html2pdf library, https://github.com/eKoopmans/html2pdf.js
function addScript(url) {
    var script = document.createElement("script");
    script.type = "application/javascript";
    script.src = url;
    document.head.appendChild(script);
}
addScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");

// The Lesson class whose instances does the job of downloading the videos and other resources
class Lesson {
    constructor(lesson, courseName, chapters, lessons) {
        this.lesson = lesson;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.fileExt = "mp4";
        this.lessonType = "video-or-pdf-or-zip";
        this.lessonIndex = "";
        this.setDataAndProcess(courseName, chapters, lessons);
    }

    async setDataAndProcess(courseName, chapters, lessons) {
        // Get the current lesson, it is 'this.lesson' but I prefer to parse it from the DOM
        const currentLesson = document.querySelector(".section-item.next-lecture");

        // Get the title of the lesson
        this.lessonTitle = currentLesson
            .querySelector(".lecture-name").innerText
            .replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1m$2s)")
            .replace(/:/g, "-").replace(/\s+_*\s*/, " ").replace(/^\d+\s*\-\s/, "").trim();

        // Get the current chapter/section and its index/number within the list of chapters
        const currentChapter = currentLesson.parentElement.parentElement;
        const currentChapterIndex = chapters.indexOf(currentChapter);

        // Get the title of the chapter
        this.chapterTitle = currentChapter
            .querySelector(".section-title").innerText
            .replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1h$2m)")
            .replace(/:/g, "-").replace(/\s+_*\s*/, " ").replace(/^\d+\s*\-\s/, "").trim();

        // Get the current lesson's index/number within the chapter
        const lessonsInCurrentChapter = currentLesson.parentElement.querySelectorAll("li");
        this.lessonNumber = Array.from(lessonsInCurrentChapter).indexOf(currentLesson) + 1;

        // Get the course count number length that will be used for a padding within the file name
        // If the total count of the lesson is 342 (for example), the length of the number is 3
        const lessonsCount = lessons.length;
        const lessonsCountLength = lessonsCount.toString().length;

        // Construct the lesson index that will be used for the file name, i.e. [017 - 342]
        this.lessonIndex = `[${(lessons.indexOf(currentLesson) + 1).toString().padStart(lessonsCountLength, "0")} - ${lessonsCount}]`;

        // Construct the name of the file, the extension will be added later
        this.fileName = `${courseName} ${this.lessonIndex} ${currentChapterIndex}. ${this.chapterTitle} ${this.lessonNumber}. ${this.lessonTitle}`;

        // Find whether there are available resources for download
        const thisLessonDownloadLinks = Array.from(document.querySelectorAll("a.download"));

        // If the list is not empty, download all - one by one, otherwise create screenshot
        if (thisLessonDownloadLinks[0]) {
            for (const link of thisLessonDownloadLinks) {
                this.lessonType = "video-or-pdf-or-zip";
                this.fileExt = link.dataset['xOriginDownloadName'].split(".").pop();
                this.src = link.href;
                const fullFileName = `${this.fileName}.${this.fileExt}`; // console.log(fullFileName);

                await this.downloadResource(fullFileName);
            }
        } else {
            this.lessonType = "quiz";
            this.fileExt = "pdf";
            this.src = document.querySelector('div[role=main].course-mainbar');
            const fullFileName = `${this.fileName}.${this.fileExt}`; // console.log(fullFileName);

            await this.downloadScreenShot(fullFileName);
        }
    }

    async downloadResource(fullFileName) {
        return fetch(this.src)
            .then(response => response.blob())
            .then(blob => {
                const blobURL = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = blobURL;
                downloadLink.style = "display: none";

                downloadLink.download = fullFileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();

                return new Promise(resolve => {
                    document.body.removeChild(downloadLink);
                    console.log(fullFileName); // Log the file name
                    setTimeout(resolve, 5500);
                });
            })
            .catch((error) => `Video fetch error: ${error}`);
    }

    async downloadScreenShot(fullFileName) {
        return html2pdf().set({ "filename": fullFileName }).from(this.src).save().then(() => {
            return new Promise(resolve => {
                console.log(fullFileName); // Log the file name
                setTimeout(resolve, 5500);
            });
        });
    }
}

// Get common data from the page
const courseName = document.querySelector(".course-sidebar-head > h2").innerText
    .replace(/\n.*$/, "").replace(/:/g, " -").trim();
let chapters = document.querySelectorAll('.course-section');
let lessons = document.querySelectorAll('.course-section li.section-item');

// Collect the data of the Lessons
// Probably instead of loop it is better to use a recursive function,
// which shifts the 'lessons' array at each iteration, process the shifted element,
// and pass the rest array to itself as callback by promise.
function download(
    startFromLesson = 1,
    lessonsNumberToDownload = null,
    listOfLessonsToDownload = null
) {
    // Handle the case when we capturing the current lesson only: startFromLesson = 1
    if (startFromLesson === 0) {
        lessonsNumberToDownload = 1;
        listOfLessonsToDownload = null;
    }

    setTimeout(() => {
        chapters = document.querySelectorAll('.course-section');
        chapters = Array.from(chapters);

        lessons = document.querySelectorAll('.course-section li.section-item');
        lessons = Array.from(lessons);

        let lessonsLoop;
        if (listOfLessonsToDownload) {
            // lessonsLoop = lessons.filter((value, index) => listOfLessonsToDownload.includes(index + 1) ? true : false);
            lessonsLoop = lessons.filter((value, index) => listOfLessonsToDownload.includes(index + 1));
            console.log(`Chapters: ${chapters.length}, Lessons: ${lessons.length}, Download items: ${listOfLessonsToDownload}`);
        } else {
            lessonsLoop = [...lessons];
            lessonsLoop.splice(0, startFromLesson - 1);
            console.log(`Chapters: ${chapters.length}, Lessons: ${lessons.length}, Start from: ${startFromLesson}, Download: ${lessonsNumberToDownload ? lessonsNumberToDownload : "all"}`);
        }

        // Create an object for each lesson, the object will do everything, including the download
        async function collectData() {
            let counter = 0;

            for (const lesson of lessonsLoop) {
                if (lessonsNumberToDownload && counter++ >= lessonsNumberToDownload && !listOfLessonsToDownload) return;

                if (lesson !== document.querySelector(".section-item.next-lecture") && startFromLesson !== 0) lesson.querySelector('a').click();

                await new Promise(resolve => setTimeout(resolve, 4000));

                const lessonItem = new Lesson(lesson, courseName, chapters, lessons);

                let timeout = 8000;
                if (lessonItem.lessonType === "quiz") timeout = 4000;
                await new Promise(resolve => setTimeout(resolve, timeout));
            }
        }
        collectData();
    }, 1000);
}

// download(3, 2);
// download(1);
download(1, 1, [3, 5, 7]);
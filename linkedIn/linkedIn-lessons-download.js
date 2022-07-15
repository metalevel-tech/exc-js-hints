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
 * - startFromLesson: the first lesson to be downloaded. Default is 1. 
 * - lessonsNumberToDownload: the number of the lessons to be downloaded. Default is null - which means no limit, or all.
 * - downloadType: 'all', 'video' or 'quiz'. Default is 'all'.
 * 
 * Examples of usage:
 *  download();                     // download all videos and quizzes from the beginning
 *  download(5);                    // download all videos and quizzes from the 5th lesson to the end
 *  download(5, 3);                 // start from the 5th lesson and download 3 videos and/pr quizzes
 *  download(5, 1);                 // download only the 5th lesson
 *  download(1, null, 'video');     // download only the videos from the beginning to the end
 * 
 * The videos are much easier to be handled, because quizzes have multiple pages and you must solve one question to view the next.
 * So probably you will want to: 1st download all videos, and then download manually the quizzes (if you need them),
 * one by one, after solving each of them - 'download(42, false);' (where 42 is the lesson number).
 */

// The Lesson class whose instances does the job of downloading the videos and quizzes
class Lesson {
    constructor(lesson, courseName, downloadType, chapters, lessons) {
        this.lesson = lesson;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.fileExt = "mp4";
        this.lessonType = "video";
        this.lessonIndex = "";
        this.setDataAndProcess(courseName, chapters, lessons, downloadType);
    }

    async setDataAndProcess(courseName, chapters, lessons, downloadType = "all") {
        // Get the current lesson, it is 'this.lesson' but I prefer to parse it from the DOM
        const currentLesson = document.querySelector(".classroom-toc-item--selected");

        // Get the title of the lesson
        this.lessonTitle = currentLesson
            .querySelector(".classroom-toc-item__title").innerText
            .replace(/\n.*$/, "").replace(/:/g, " -").replace(/^\d+\s*[-.]\s/, "").trim();

        // Get the current chapter/section and its index/number within the list of chapters
        const currentChapter = currentLesson.parentElement.parentElement;
        const currentChapterIndex = chapters.indexOf(currentChapter);

        // Get the title of the chapter
        this.chapterTitle = currentChapter
            .querySelector("h2 span.classroom-toc-section__toggle-title").innerText
            .replace(/\n.*$/, "").replace(/:/g, " -").replace(/^\d+\s*[-.]\s/, "").trim();

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

        // Check whether the lesson is quiz or video and process it accordingly
        if (this.lessonTitle === "Chapter Quiz") {
            this.lessonType = "quiz";
            this.fileExt = "png";
            this.src = document.querySelector(".classroom-quiz .chapter-quiz");
            const fullFileName = `${this.fileName}.${this.fileExt}`; // console.log(fullFileName);

            if (downloadType === "all" || downloadType === "quiz") {
                await this.downloadPng(fullFileName);
            } else {
                console.log(`${fullFileName} :: is skipped!`);
            }
        } else {
            this.lessonType = "video";
            this.fileExt = "mp4";
            this.src = document.querySelector("video").src;
            const fullFileName = `${this.fileName}.${this.fileExt}`; // console.log(fullFileName);

            if (downloadType === "all" || downloadType === "video") {
                await this.downloadVideo(fullFileName);
            } else {
                console.log(`${fullFileName} is skipped!`);
            }
        }
    }

    async downloadVideo(fullFileName) {
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
                    setTimeout(resolve, 1500);
                });
            })
            .catch((error) => `Video fetch error: ${error}`);
    }

    async downloadPng(fullFileName) {
        return domtoimage.toPng(this.src)
            .then(function (dataUrl) {
                const downloadLink = document.createElement("a");
                downloadLink.href = dataUrl;
                document.body.appendChild(downloadLink);
                downloadLink.download = fullFileName;
                downloadLink.click();

                return new Promise(resolve => {
                    setTimeout(() => {
                        document.body.removeChild(downloadLink);
                        resolve();
                    }, 3500);
                });

            })
            .catch(function (error) {
                console.error("Oops, something went wrong with DOM-to-image!", error);
            });
    }

}

// Get common data from the page
const courseName = document.querySelector(".classroom-nav__details h1").innerText.replace(/\n.*$/, "").trim();
let chapters = document.querySelectorAll("section.classroom-toc-section"); // ("ul.classroom-toc-section__items")
let lessons = document.querySelectorAll("li.classroom-toc-item");

function download(startFromLesson = 1, lessonsNumberToDownload = null, downloadType = "all") {
    // Expand all sections
    const buttons = document.querySelectorAll("section > h2 > button.classroom-toc-section__toggle");
    buttons.forEach(button => {
        if (button.ariaExpanded == "false") button.click();
    });

    // Collect the data of the lessons
    setTimeout(() => {
        chapters = document.querySelectorAll("section.classroom-toc-section");
        chapters = Array.from(chapters);

        lessons = document.querySelectorAll("li.classroom-toc-item");
        lessons = Array.from(lessons);

        const lessonsLoop = [...lessons];
        lessonsLoop.splice(0, startFromLesson - 1);

        console.log(`Chapters: ${chapters.length}, Lessons: ${lessons.length}, Start from: ${startFromLesson}`);

        // Create an object for each lesson, the object will do everything, including the download
        async function collectData() {
            let counter = 0;

            for (const lesson of lessonsLoop) {
                if (lessonsNumberToDownload && counter++ >= lessonsNumberToDownload) return;

                lesson.querySelector("a").click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                const lessonItem = new Lesson(lesson, courseName, downloadType, chapters, lessons);

                let timeout = 2000;
                if (lessonItem.lessonType === "quiz") timeout = 4000;
                await new Promise(resolve => setTimeout(resolve, timeout));
            }
        }
        collectData();
    }, 1000);
}

download(1);
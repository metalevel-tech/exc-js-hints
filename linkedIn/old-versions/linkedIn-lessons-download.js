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
 * + downloadType: if 'all', the script will download all the videos and quizzes.
 *      Default is 'all'. When the second param is set to 'false' (default) you don't need to specify this value.
 *      If 'quiz', the script will download only quizzes.
 *      If 'video', the script will download only videos.
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

// The Lesson class whose instances does the job of downloading the videos and quizzes
class Lesson {
    constructor(lessonItem, courseName, lessonIndex, downloadType) {
        this.lessonItem = lessonItem;
        this.courseName = courseName;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.lessonType = "video";
        this.lessonIndex = lessonIndex;
        this.setData(downloadType);
    }

    async setData(downloadType = "all") {
        const currentLesson = document.querySelector(".classroom-toc-item--selected");

        this.lessonTitle = currentLesson
            .querySelector(".classroom-toc-item__title").innerText.replace(/\n.*$/, "").replace(/:/g, " -").trim();

        this.chapterTitle = currentLesson.parentElement.parentElement
            .querySelector("h2 span.classroom-toc-section__toggle-title").innerText.replace(/\n.*$/, "").replace(/:/g, " -").trim();

        if (this.chapterTitle === "Introduction") this.chapterTitle = `0. ${this.chapterTitle}`;
        if (this.chapterTitle === "Conclusion") this.chapterTitle = `${chapters.length - 1}. ${this.chapterTitle}`;

        const lessonsInCurrentChapter = currentLesson.parentElement.querySelectorAll("li");
        this.lessonNumber = Array.from(lessonsInCurrentChapter).indexOf(currentLesson) + 1;

        this.fileName = `${this.courseName} [${this.lessonIndex}] ${this.chapterTitle} ${this.lessonNumber}. ${this.lessonTitle}`;

        if (this.lessonTitle === "Chapter Quiz") {
            if (downloadType === "all" || downloadType === "quiz") {
                this.lessonType = "quiz";
                this.src = document.querySelector(".classroom-quiz .chapter-quiz");
                console.log(this.fileName);
                await this.downloadPng();
            } else {
                console.log(`${this.fileName} :: is skipped.`);
            }
        } else {
            if (downloadType === "all" || downloadType === "video") {
                this.lessonType = "video";
                this.src = document.querySelector("video").src;
                console.log(this.fileName);
                await this.downloadVideo();
            } else {
                console.log(`${this.fileName} is skipped.`);
            }
        }
    }

    async downloadVideo() {
        const fileName = `${this.fileName}.mp4`;

        return fetch(this.src)
            .then(response => response.blob())
            .then(blob => {
                const blobURL = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = blobURL;
                downloadLink.style = "display: none";

                downloadLink.download = fileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();

                return new Promise(resolve => {
                    setTimeout(() => {
                        document.body.removeChild(downloadLink);
                        resolve();
                    }, 1500);
                });
            })
            .catch((error) => `Fetch error: ${error}`);
    }

    async downloadPng() {
        const fileName = `${this.fileName}.png`;

        return domtoimage.toPng(this.src)
            .then(function (dataUrl) {
                const downloadLink = document.createElement("a");
                downloadLink.href = dataUrl;
                document.body.appendChild(downloadLink);
                downloadLink.download = fileName;
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
let chapters = document.querySelectorAll("ul.classroom-toc-section__items");
let lessons = document.querySelectorAll("li.classroom-toc-item");

function download(startFromLesson = 1, single = false, downloadType = "all") {
    // Expand all sections
    const buttons = document.querySelectorAll("section > h2 > button.classroom-toc-section__toggle");
    buttons.forEach(button => {
        if (button.ariaExpanded == "false") button.click();
    });

    // Collect the data of the lessons
    setTimeout(() => {
        chapters = document.querySelectorAll("ul.classroom-toc-section__items");
        lessons = document.querySelectorAll("li.classroom-toc-item");
        lessons = Array.from(lessons);

        const lessonsNumber = lessons.length;
        
        lessons.splice(0, startFromLesson - 1);

        // Create a Video object for each lesson - collect information
        async function collectData() {
            if (single) {
                    const lessonIndex = `${startFromLesson} - ${lessonsNumber}`;
                    const video = new Lesson(lessons[startFromLesson - 1], courseName, lessonIndex);
                    let timeout = 2000;
                    if (video.lessonType === "quiz") timeout = 4000;
                    await new Promise(resolve => setTimeout(resolve, timeout));
            } else {
                for (const lesson of lessons) {
                    lesson.querySelector("a").click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const lessonIndex = `${lessons.indexOf(lesson) + startFromLesson} - ${lessonsNumber}`;
                    const lessonItem = new Lesson(lesson, courseName, lessonIndex, downloadType);
                    let timeout = 2000;
                    if (lessonItem.lessonType === "quiz") timeout = 4000;
                    await new Promise(resolve => setTimeout(resolve, timeout));
                }

            }
        }
        collectData();
    }, 1000);
}

// download(1, false, "all");
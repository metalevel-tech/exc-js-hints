/**
 * Download Teachable Courses.
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
                await new Promise(resolve => setTimeout(resolve(), 10000));
                
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
download(1);
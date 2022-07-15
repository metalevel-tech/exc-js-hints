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

// The Lesson class whose instances does the job of downloading the videos and other resources
class Lesson {
    constructor(lesson, courseName, chapters, lessons) {
        this.lesson = lesson;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.fileExt = ".mp4";
        this.lessonType = "video-or-pdf-or-zip";
        this.lessonIndex = "";
        this.setDataAndProcess(courseName, chapters, lessons);
    }

    async setDataAndProcess(courseName, chapters, lessons) {
        // this.lesson - but I prefer to parse it from the DOM
        const currentLesson = document.querySelector(".section-item.next-lecture");
        
        // Get the title of the lesson
        this.lessonTitle = currentLesson
            .querySelector(".lecture-name").innerText.replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1m$2s)").replace(/:/g, "-").replace(/\s+_*\s*/, " ").replace(/^\d+\s*\-\s/, "").trim();

        // Get the current chapter/section and its index/number within the list of chapters
        const currentChapter = currentLesson.parentElement.parentElement;
        const currentChapterIndex = chapters.indexOf(currentChapter);
        
        // Get the title of the chapter
        this.chapterTitle = currentChapter
            .querySelector(".section-title").innerText.replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1h$2m)").replace(/:/g, "-").replace(/\s+_*\s*/, " ").replace(/^\d+\s*\-\s/, "").trim();

        // Get the current lesson's index/number within the chapter
        const lessonsInCurrentChapter = currentLesson.parentElement.querySelectorAll("li");
        this.lessonNumber = Array.from(lessonsInCurrentChapter).indexOf(currentLesson) + 1;

        // Get the course count number length that will be used for a padding within the file name
        // If the total count of the lesson is 342 (for example), the length of the number is 3
        const lessonsCount = lessons.length;
        const lessonsCountLength = lessonsCount.toString().length;

        // Construct the lesson index that will be used for the file name, i.e. [017 - 342]
        this.lessonIndex = `${(lessons.indexOf(currentLesson) + 1).toString().padStart(lessonsCountLength, "0")} - ${lessonsCount}`;

        // Construct the name of the file, the extension will be added later
        this.fileName = `${courseName} [${this.lessonIndex}] ${currentChapterIndex}. ${this.chapterTitle} ${this.lessonNumber}. ${this.lessonTitle}`;

        // Find whether there are available resources for download
        const thisDownloadLinks = Array.from(document.querySelectorAll("a.download"));

        // If the list is not empty, download all - one by one, otherwise create screenshot
        if (thisDownloadLinks[0]) {
            for (const link of thisDownloadLinks) {
                this.lessonType = "video-or-pdf-or-zip";
                this.fileExt = link.dataset['xOriginDownloadName'].split(".").pop();
                this.src = link.href;
                
                const fullFileName = `${this.fileName}.${this.fileExt}`;
                // console.log(fullFileName);
    
                await this.downloadResource(fullFileName);
            }
        } else {
            this.lessonType = "quiz";
            this.src = document.querySelector('div[role=main].course-mainbar');
            
            const fullFileName = `${this.fileName}.pdf`;
            // console.log(fullFileName);

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
                    console.log(fullFileName); // Log the file name
                    document.body.removeChild(downloadLink);
                    setTimeout(resolve, 5500);
                });
                
                // Tested version, but the above looks much clear
                // return new Promise(resolve => {
                //     setTimeout(() => {
                //         console.log(fullFileName);
                //         document.body.removeChild(downloadLink);
                //         resolve();
                //     }, 3500);
                // });
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
const courseName = document.querySelector(".course-sidebar-head > h2").innerText.replace(/\n.*$/, "").trim();
let chapters = document.querySelectorAll('.course-section');
let lessons = document.querySelectorAll('.course-section li.section-item');

// Collect the data of the Lessons
// Probably instead of loop it is better to use a recursive function,
// which shifts the 'lessons' array at each iteration, process the shifted element,
// and pass the rest array to itself as callback by promise.
function download(offset = 1, articlesNumberToDownload = null) {

    setTimeout(() => {
        chapters = document.querySelectorAll('.course-section');
        chapters = Array.from(chapters);

        lessons = document.querySelectorAll('.course-section li.section-item');
        lessons = Array.from(lessons);

        lessonsLoop = [...lessons];
        lessonsLoop.splice(0, offset - 1);

        console.log(chapters.length, lessons.length);
        
        // Create an object for each lesson,
        // the object will do everything, 
        // including the download
        async function collectData() {
            let counter = 0;

            for (const lesson of lessonsLoop) {
                if (articlesNumberToDownload && counter++ >= articlesNumberToDownload) return;

                lesson.querySelector('a').click();
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

// download(15, 1);
download(1);

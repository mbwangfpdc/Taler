console.log(document.getElementById("results")!.style.height);
console.log(document.getElementById("body")!.style.height);
// document.getElementById("results")!.style.height = window.screen.availHeight.toString() + "px";
console.log(document.getElementById("results")!.style.height);
console.log(document.getElementById("body")!.style.height);
console.log(window.screen.availHeight.toString());
console.log(visualViewport!.height);

const corpus = [
    "Hello world",
    "Hello world1",
    "Hello world2",
    "Hello world3",
    "Hello world4",
    "Hello world5",
    "Hello world6",
    "Hello world7",
    "Hello world8",
    "Hello world9",
    "Hello world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0 world0",
    "Hello my name is Morgan",
    "It's a small world!"
]

// The inverted index is from a single word to the set of phrases that contain it
// There is pseudo fuzzy matching on the word right now, casing and special characters are considered
// In the future, if this is too slow this process can be moved to the server for parallelization, caching,
function generateIndex(corpus: Array<string>): Map<string, Set<number>> {
    const index = new Map<string, Set<number>>();
    for (let i = 0; i < corpus.length; i++) {
        const sentence = corpus[i];
        const addToIndex = (key: string, val: number) => {
            if (!index.has(key)) {
                index.set(key, new Set([val]));
            } else {
                index.get(key)!.add(val);
            }
        }
        for (const rawWord of sentence.split(" ")) {
            addToIndex(rawWord, i);
            addToIndex(rawWord.toLowerCase(), i);
            addToIndex(rawWord.replace(/\W/g, ''), i);
            addToIndex(rawWord.toLowerCase().replace(/\W/g, ''), i);
        }
    }
    console.log(index)
    return index;
}

const index: Map<string, Set<number>> = generateIndex(corpus);

const emptyElement = document.getElementById("empty")!;
const inputElement = document.getElementById("input")! as HTMLInputElement;
inputElement.addEventListener("input", queryAndUpdateResults);
const resultsElement = document.getElementById("results")! as HTMLDivElement;
const taleElement = document.getElementById("tale")! as HTMLDivElement;
const resultPhraseElement = ((): HTMLSpanElement => {
    let phrase = document.createElement("span");
    phrase.classList.add("phrase");
    phrase.draggable = true;
    return phrase;
})();
const talePhraseElement = ((): HTMLSpanElement => {
    let phrase = document.createElement("span");
    phrase.classList.add("phrase");
    phrase.draggable = true;
    return phrase;
})();
const talePhraseInsertMarkerWrapperElement = ((): HTMLSpanElement => {
    let wrapper = document.createElement("span");
    let phraseInsertMarker = document.createElement("span");
    phraseInsertMarker.setAttribute("name", "phraseInsertMarker");
    phraseInsertMarker.textContent = "|";
    phraseInsertMarker.style.fontWeight = "bold";
    phraseInsertMarker.style.color = "green";
    phraseInsertMarker.style.opacity = "0%";
    wrapper.appendChild(phraseInsertMarker);
    return wrapper;
})();
const emptySet = new Set<number>();
let resultPhrases = new Set<number>();
const talePhrases = new Set<number>();

taleElement.appendChild(talePhraseInsertMarkerWrapperElement);

function makePhrase(phraseId: number): HTMLSpanElement {
    let phrase = resultPhraseElement.cloneNode(true) as HTMLSpanElement;
    phrase.addEventListener("click", movePhraseToTale);
    phrase.setAttribute("data-phrase-id", phraseId.toString());
    phrase.textContent = corpus[phraseId];
    return phrase as HTMLSpanElement;
}

taleElement.addEventListener("dragover", onDragOverTale);
taleElement.addEventListener("dragenter", onDragEnterTale);
taleElement.addEventListener("dragleave", onDragLeaveTale);
taleElement.addEventListener("drop", onDragPhraseDrop);
function makeTalePhrase(phraseId: number): HTMLSpanElement {
    let containerSpan = talePhraseInsertMarkerWrapperElement.cloneNode(true) as HTMLSpanElement;
    let phrase = resultPhraseElement.cloneNode(true) as HTMLSpanElement;
    phrase.addEventListener("click", removePhraseFromTale);
    phrase.addEventListener("dragstart", onDragPhraseStart);
    phrase.addEventListener("dragend", onDragPhraseEnd);
    phrase.setAttribute("data-phrase-id", phraseId.toString());
    phrase.textContent = corpus[phraseId];
    containerSpan.insertBefore(phrase, containerSpan.firstChild);
    return containerSpan;
}

function queryAndUpdateResults(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    resultPhrases = index.get(query) || emptySet;
    const newChildren = Array.from(resultPhrases).filter((phrase) => !talePhrases.has(phrase)).map(makePhrase);
    let newNewChildren = [];
    for (const child of newChildren) {
        newNewChildren.push(child);
    }
    resultsElement.replaceChildren(...newNewChildren);
    console.log(newChildren);
}

function movePhraseToTale(event: Event) {
    const resultPhraseElement = event.target as HTMLSpanElement;
    const phraseId = parseInt(resultPhraseElement.getAttribute("data-phrase-id")!);
    talePhrases.add(phraseId);

    resultPhraseElement.remove();
    taleElement.appendChild(makeTalePhrase(phraseId));

    console.log("movePhraseToTale triggered");
}

function removePhraseFromTale(event: Event) {
    const resultPhraseElement = event.target as HTMLSpanElement;
    const phraseId = parseInt(resultPhraseElement.getAttribute("data-phrase-id")!);
    talePhrases.delete(phraseId);

    resultPhraseElement.parentElement!.remove();
    if (resultPhrases.has(phraseId)) {
        resultsElement.appendChild(makePhrase(phraseId));
    }

    console.log("removePhraseFromTale triggered");
}

// Return the center of this element's bounding box as a x,y pair.
function originOfElement(htmle: HTMLElement): [number, number] {
    let rect = htmle.getBoundingClientRect();
    return [rect.left + rect.width/2, rect.top + rect.height/2];
}

// Return the index of the number in the given array closest to target
// Assumes num is non-empty and sorted in some direction
function nearestNumber(target: number, nums: Array<number>) {
    let distance = Infinity;
    for (let i = 0; i < nums.length; i++) {
        const newDistance = Math.abs(target - nums[i]);
        if (newDistance < distance) {
            distance = newDistance
        } else if (newDistance > distance) {
            return nums[i - 1]; // We started getting further away from the target
        }
    }
    return nums[nums.length - 1];
}

// Given a x,y point, find the point nearest to it in another array of x points
// Prioritize matching y, then x.
// Assumes the points are primarily sorted by y then sorted by x in some direction
function nearestPoint(origin: [number, number], points: Array<[number, number]>) {
    let y = nearestNumber(origin[1], points.map(xy => xy[1]));
    // Only consider points which are on the same row (same y)
    let x = nearestNumber(origin[0], points.filter(point => point[1] === y).map(xy => xy[0]));
    return points.findIndex(xy => xy[0] === x && xy[1] === y);
}
let draggedPhrase: HTMLSpanElement;
let currentInsertMarkers: NodeListOf<HTMLSpanElement>;
let currentInsertMarkerOrigins: [number, number][];
let activePhraseInsertMarker: HTMLSpanElement;
let dragLocation = 2; // 0 is outside of the tale, 1 is in the tale, 2 is in a nested element
function getNearestMarker(point: [number, number]): HTMLSpanElement {
    return currentInsertMarkers[nearestPoint(point, currentInsertMarkerOrigins)];
}
function onDragPhraseStart(event: DragEvent) {
    console.log("dragStart " + (event.target as HTMLElement).textContent);
    draggedPhrase = (event.target as HTMLSpanElement);
    draggedPhrase.classList.add("faded");
    event.dataTransfer!.setDragImage(emptyElement, 0, 0);
    event.dataTransfer!.dropEffect = "none";
    event.dataTransfer!.effectAllowed = "none";

    currentInsertMarkers = document.getElementsByName("phraseInsertMarker");
    currentInsertMarkerOrigins = Array.from(currentInsertMarkers).map(originOfElement);
    let nearestMarker = getNearestMarker([event.clientX, event.clientY]);
    activePhraseInsertMarker = nearestMarker;
    activePhraseInsertMarker.style.opacity = "100%";
}
function onDragPhraseEnd(event: DragEvent) {
    console.log("phraseEnd " + (event.target as HTMLElement).textContent);
    draggedPhrase.classList.remove("faded");
    activePhraseInsertMarker.style.opacity = "0%";
}
function onDragOverTale(event: DragEvent) {
    event.preventDefault();
    console.log("dragOver " + (event.target as HTMLElement).textContent);
    let nearestMarker = getNearestMarker([event.clientX, event.clientY]);
    if (nearestMarker != activePhraseInsertMarker) {
        nearestMarker.style.opacity = "100%";
        activePhraseInsertMarker.style.opacity = "0%";
        activePhraseInsertMarker = nearestMarker;
    }
    return false;
}
// let
function onDragEnterTale(event: DragEvent) {
    event.preventDefault();
    console.log("enterTale " + (event.target as HTMLElement).textContent);
    if ((event.target as HTMLElement).id === "tale") {
        if (dragLocation === 0) {
            let nearestMarker = getNearestMarker([event.clientX, event.clientY]);
            activePhraseInsertMarker = nearestMarker;
            activePhraseInsertMarker.style.opacity = "100%";
            console.log("Entered Tale from outside, reactivating marker");
        }
        console.log("Entered Tale, dragLocation=1");
        dragLocation = 1
    } else {
        dragLocation = 2;
    }
}
function onDragLeaveTale(event: DragEvent) {
    console.log("leaveTale " + (event.target as HTMLElement).textContent);
    if ((event.target as HTMLElement).id === "tale") {
        if (dragLocation === 1) {
            console.log("Left the tale!");
            dragLocation = 0;
            activePhraseInsertMarker.style.opacity = "0%";
        } else {
            console.log("Left the tale but didn't do nothin, since dragLocation===", dragLocation);
        }
    }
}
// Insert the element at the marker
function onDragPhraseDrop(event: DragEvent) {
    console.log("drop " + (event.target as HTMLElement).textContent);
    // Both phrase insert markers and phrases are found in wrapper containers.
    activePhraseInsertMarker.parentElement!.parentElement!.insertBefore(draggedPhrase.parentElement!, activePhraseInsertMarker.parentElement!.nextSibling);
}

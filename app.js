// Base URL for the Hacker News API
const API_BASE_URL = "https://hacker-news.firebaseio.com/v0";

// Number of items to show per page
const ITEMS_PER_PAGE = 10;

// Maximum number of live updates to show
const LIVE_UPDATES_LIMIT = 10;

// Current page number (starts at 0)
let currentPage = 0;

// Current filter type (default is 'story')
let currentFilter = "story";

// Flag to check if we're currently loading posts
let isLoading = false;

// Array to store all live updates
let allLiveUpdates = [];

// Array to store all fetched item IDs
let allItemIds = [];

// Function to fetch a single item's details
async function fetchItem(id) {
  const response = await fetch(`${API_BASE_URL}/item/${id}.json`);
  return await response.json();
}

function extractobjectIDs(data){
    return data.hits.map(item => item.objectID)
}

// Function to fetch item IDs based on the current filter
async function fetchItemIds() {
  let endpoint;
  if (currentFilter === "story") {
    endpoint = `${API_BASE_URL}/newstories.json`;
  } else if (currentFilter === "job") {
    endpoint = `${API_BASE_URL}/jobstories.json`;
  } else if (currentFilter === "poll") {
    endpoint = `https://hn.algolia.com/api/v1/search_by_date?tags=poll`;

    const response = await fetch(endpoint);

    if (!response.ok){
        throw new Error('http error! Status: ${response.status}')
    }

    const data = await response.json();
    const pollsIds = extractobjectIDs(data)
    return pollsIds
  }

  const response = await fetch(endpoint);
  return await response.json();
}

// Function to fetch and display posts
async function fetchAndDisplayPosts() {
  if (isLoading) return;
  isLoading = true;

  try {
    // If we haven't fetched any item IDs yet, fetch them
    if (allItemIds.length === 0) {
      allItemIds = await fetchItemIds();
    }

    // Ensure allItemIds is an array
    if (!Array.isArray(allItemIds)) {
      console.error("allItemIds is not an array:", allItemIds);
      allItemIds = [];
      return;
    }

    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPageIds = allItemIds.slice(startIndex, endIndex);

    const posts = await Promise.all(currentPageIds.map(fetchItem));
    posts.sort((a, b) => b.time - a.time);

    for (const post of posts) {
      displayPost(post);
    }

    currentPage++;
  } catch (error) {
    console.error("Error in fetchAndDisplayPosts:", error);
  } finally {
    isLoading = false;
  }
}

// Function to display a single post
function displayPost(post) {
  const postsList = document.getElementById("posts-list");
  const postElement = document.createElement("li");
  postElement.classList.add("post");

  const title = post.title || post.type;
  const formattedTime = formatTimestamp(post.time);
  const commentCount = post.kids ? post.kids.length : 0;

  postElement.innerHTML = `
        <div class="post-header">
            <h3>${title}</h3>
            <div class="post-meta">
                <p>Posted: ${formattedTime}</p>
                <p>Comments: ${commentCount}</p>
            </div>
        </div>
        <div class="post-content">
            <p>By: ${post.by || "Anonymous"}</p>
            <p>Score: ${post.score || "N/A"}</p>
            ${
              post.url
                ? `<p><a href="${post.url}" target="_blank">Read more</a></p>`
                : ""
            }
            ${post.text ? `<div class="post-text">${post.text}</div>` : ""}
            ${post.type === "poll" ? `<div class="poll-options"></div>` : ""}
            <div class="comments-container"></div>
        </div>
    `;

  const postHeader = postElement.querySelector(".post-header");
  const postContent = postElement.querySelector(".post-content");

  // Add click event to toggle post content visibility
  postHeader.addEventListener("click", () => {
    if (
      postContent.style.display === "none" ||
      postContent.style.display === ""
    ) {
      postContent.style.display = "block";
      if (post.type === "poll") {
        fetchAndDisplayPollOptions(post, postContent.querySelector(".poll-options"));
      }
      if (post.kids && !postContent.querySelector(".comment")) {
        const commentsContainer = postContent.querySelector(
          ".comments-container"
        );
        fetchAndDisplayComments(post.kids, commentsContainer);
      }
    } else {
      postContent.style.display = "none";
    }
  });

  postsList.appendChild(postElement);
}

// New function to fetch and display poll options
async function fetchAndDisplayPollOptions(poll, pollOptionsContainer) {
  if (!poll.parts || poll.parts.length === 0) {
    pollOptionsContainer.innerHTML = "<p>No poll options available.</p>";
    return;
  }

  const pollOptions = await Promise.all(poll.parts.map(fetchItem));
  pollOptionsContainer.innerHTML = "<h4>Poll Options:</h4>";

  pollOptions.forEach((option) => {
    const optionElement = document.createElement("div");
    optionElement.classList.add("poll-option");
    optionElement.innerHTML = `
      <p>${option.text}</p>
      <p>Votes: ${option.score || 0}</p>
    `;
    pollOptionsContainer.appendChild(optionElement);
  });
}

// Function to fetch and display comments
async function fetchAndDisplayComments(
  commentIds,
  parentElement,
  isNested = false
) {
  const comments = await Promise.all(commentIds.map(fetchItem));
  comments.sort((a, b) => b.time - a.time);

  for (const comment of comments) {
    if (comment && comment.text) {
      displayComment(comment, parentElement, isNested);
    }
  }
}

// Function to display a single comment
function displayComment(comment, parentElement, isNested = false) {
  const commentElement = document.createElement("div");
  commentElement.classList.add("comment");
  if (isNested) {
    commentElement.classList.add("nested-comment");
  }

  const formattedTime = formatTimestamp(comment.time);

  commentElement.innerHTML = `
        <div class="comment-content">${comment.text}</div>
        <div class="comment-meta">
            <p>By: ${comment.by || "Anonymous"}</p>
            <p>Posted: ${formattedTime}</p>
        </div>
    `;

  if (comment.kids) {
    const showRepliesButton = document.createElement("button");
    showRepliesButton.textContent = `Show ${comment.kids.length} replies`;
    showRepliesButton.addEventListener("click", () => {
      const subCommentsContainer = document.createElement("div");
      subCommentsContainer.classList.add("sub-comments-container");
      commentElement.appendChild(subCommentsContainer);
      fetchAndDisplayComments(comment.kids, subCommentsContainer, true);
      showRepliesButton.style.display = "none";
    });
    commentElement.appendChild(showRepliesButton);
  }

  parentElement.appendChild(commentElement);
}

// Function to format timestamp
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Function to update live data
async function updateLiveData() {
  try {
    const latestItemIds = await fetchItemIds();

    // If allItemIds is empty, this is the first run
    if (allItemIds.length === 0) {
      allItemIds = latestItemIds;
      // Display the first LIVE_UPDATES_LIMIT items as live updates
      const initialUpdates = await Promise.all(
        latestItemIds.slice(0, LIVE_UPDATES_LIMIT).map(fetchItem)
      );
      allLiveUpdates = initialUpdates;
      displayLiveUpdates();
    } else {
      const newItemIds = latestItemIds.filter((id) => !allItemIds.includes(id));

      if (newItemIds.length > 0) {
        const newPosts = await Promise.all(
          newItemIds.slice(0, LIVE_UPDATES_LIMIT).map(fetchItem)
        );
        allLiveUpdates = [...newPosts, ...allLiveUpdates].slice(
          0,
          LIVE_UPDATES_LIMIT
        );
        displayLiveUpdates();
        allItemIds = latestItemIds;
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}

// Function to display live updates
function displayLiveUpdates() {
  try {
    const liveUpdatesList = document.getElementById("live-updates-list");
    liveUpdatesList.innerHTML = "";

    allLiveUpdates.forEach((item) => {
      const listItem = document.createElement("li");
      const formattedTime = formatTimestamp(item.time);
      listItem.innerHTML = `
            ${item.type}: ${item.title || "Item"}
            <div class="live-update-time">${formattedTime}</div>
        `;
      listItem.addEventListener("click", () => {
        displayPost(item);
        document
          .getElementById("posts-list")
          .prepend(document.querySelector("#posts-list .post:last-child"));
      });
      liveUpdatesList.appendChild(listItem);
    });
  } catch (error) {
    console.log(error.message);
  }
}

// Function to handle filter button clicks
function handleFilterClick(event) {
  // Remove 'active' class from all buttons
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));

  // Add 'active' class to the clicked button
  event.target.classList.add("active");

  // Update the current filter
  currentFilter = event.target.dataset.type;

  // Reset the page number and clear the posts list
  currentPage = 0;
  document.getElementById("posts-list").innerHTML = "";

  // Clear the fetched item IDs and live updates
  allItemIds = [];
  allLiveUpdates = [];

  // Fetch and display posts with the new filter
  fetchAndDisplayPosts();
  updateLiveData();
}

// Function to initialize the application
async function init() {
  // Fetch initial data and display posts
  allItemIds = await fetchItemIds();
  await fetchAndDisplayPosts();

  // Start live updates
  await updateLiveData();
  setInterval(updateLiveData, 5000);

  // Add scroll event listener for infinite scrolling
  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      fetchAndDisplayPosts();
    }
  });

  // Add click event listeners to filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", handleFilterClick);
  });
}

// Start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", init);
module.exports = {
  fetchItem,
  fetchItemIds,
  formatTimestamp,
  displayPost,
  displayComment,
};
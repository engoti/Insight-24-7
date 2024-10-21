const {
  fetchItem,
  fetchItemIds,
  formatTimestamp,
  displayPost,
  displayComment,
} = require('./app');

// Mock fetch for API requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ id: 1, title: "Test Item", time: 1620000000 }),
  })
);

describe('Hacker News Application Tests', () => {
  test('fetchItem retrieves and parses item data correctly', async () => {
    const result = await fetchItem(1);
    expect(result).toEqual({ id: 1, title: "Test Item", time: 1620000000 });
    expect(fetch).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/item/1.json"
    );
  });

  test('fetchItemIds retrieves story IDs correctly', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve([1, 2, 3]),
      })
    );
    const result = await fetchItemIds();
    expect(result).toEqual([1, 2, 3]);
    expect(fetch).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/newstories.json"
    );
  });

  test('formatTimestamp converts Unix timestamp to readable date', () => {
    const timestamp = 1631234567;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(
      /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)/
    );
  });

  test('displayPost creates and appends post element correctly', () => {
    document.body.innerHTML = `<ul id="posts-list"></ul>`;
    const mockPost = { id: 1, title: "Test Post", time: 1620000000, by: "user", score: 100 };

    displayPost(mockPost);

    const postsList = document.getElementById("posts-list");
    expect(postsList.children.length).toBe(1);
  });

  test('displayComment creates and appends comment element correctly', () => {
    const mockComment = { id: 1, text: "Test comment", time: 1620000000, by: "user" };
    const parentElement = document.createElement("div");

    displayComment(mockComment, parentElement);

    expect(parentElement.children.length).toBe(1);
    expect(parentElement.querySelector(".comment-content").textContent).toBe("Test comment");
  });
});

import "cross-fetch/polyfill";
import { GraphQLClient, gql } from "graphql-request";
import seedDatabase, { post1 } from "./utils/seedDatabase";
import { userOne } from "./utils/seedDatabase";

const client = new GraphQLClient("http://127.0.0.1:4000/graphql");

beforeEach(seedDatabase);

test("Should show published posts", async () => {
    const query = gql`
        query {
            posts {
                id
            }
        }
    `;

    const { posts } = await client.request(query);

    expect(posts.length).toBeGreaterThan(0);
});

test("Should fetch user posts", async () => {
    client.setHeader("authorization", `Bearer ${userOne.token}`);
    const query = gql`
        query {
            myPosts {
                id
            }
        }
    `;

    const { myPosts } = await client.request(query);

    expect(myPosts.length).toBe(2);
});

test("Should be able to update own post", async () => {
    client.setHeader("authorization", `Bearer ${userOne.token}`);
    const mutation = gql`
        mutation {
            updatePost(id: "${post1.id}", data: { published: false }){
                id
                title
                body
                published
            }
        }
    `;

    const { updatePost } = await client.request(mutation);

    expect(updatePost.published).toBe(false);
});

test("Should create a new post", async () => {
    client.setHeader("authorization", `Bearer ${userOne.token}`);
    const mutation = gql`
        mutation {
            createPost(
                data: {
                    title: "Learn Jest"
                    body: "Automated tests"
                    published: true
                }
            ) {
                id
                title
                body
                published
            }
        }
    `;

    const { createPost } = await client.request(mutation);

    expect(createPost.title).toBe("Learn Jest");
    expect(createPost.body).toBe("Automated tests");
    expect(createPost.published).toBe(true);
});

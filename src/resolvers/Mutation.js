import { v4 as uuidv4 } from "uuid";
import { GraphQLYogaError } from "@graphql-yoga/node";

const Mutation = {
  createUser(parent, args, { db }, info) {
    const emailToken = db.users.some((user) => {
      return user.email === args.data.email;
    });

    if (emailToken) {
      throw new GraphQLYogaError("Email taken");
    }

    const user = {
      id: uuidv4(),
      ...args.data,
    };

    db.users.push(user);

    return user;
  },
  deleteUser(parent, args, { db }, info) {
    const userIndex = db.users.findIndex((user) => user.id === args.id);

    if (userIndex === -1) {
      throw new GraphQLYogaError("User not found");
    }

    const deletedUser = db.users.splice(userIndex, 1);

    db.posts = db.posts.filter((post) => {
      const match = post.author === args.id;

      if (match) {
        db.comments = db.comments.filter((comment) => comment.post !== post.id);
      }

      return !match;
    });

    db.comments = db.comments.filter((comment) => comment.author !== args.id);

    return deletedUser[0];
  },
  updateUser(parent, args, { db }, info) {
    const { id, data } = args;
    const user = db.users.find((user) => user.id === id);

    if (!user) {
      throw new GraphQLYogaError("User not found");
    }

    if (typeof data.email === "string") {
      const emailTaken = db.users.some((user) => user.email === data.email);

      if (emailTaken) {
        throw new GraphQLYogaError("Email Taken");
      }

      user.email = data.email;
    }

    if (typeof data.name === "string") {
      user.name = data.name;
    }

    if (typeof data.age !== "undefined") {
      user.age = data.age;
    }

    return user;
  },
  createPost(parent, args, { db }, info) {
    const userExists = db.users.some((user) => user.id === args.data.author);

    if (!userExists) {
      throw new GraphQLYogaError("User not found");
    }
    const post = {
      id: uuidv4(),
      ...args.data,
    };
    db.posts.push(post);

    return post;
  },
  deletePost(parent, args, { db }, info) {
    const postIndex = db.posts.findIndex((post) => post.id === args.id);

    if (postIndex === -1) {
      throw new GraphQLYogaError("Post not found");
    }

    const deletedPost = db.posts.splice(postIndex, 1);

    comments = db.comments.filter((comment) => comment.post !== args.id);

    dereturnletedPost[0];
  },
  updatePost(parent, args, { db }, info) {
    const { id, data } = args;
    const post = db.posts.find((post) => post.id === id);

    if (!post) {
      throw new GraphQLYogaError("Post not found");
    }

    if (typeof data.email === "string") {
      const emailTaken = db.users.some((user) => user.email === data.email);

      if (emailTaken) {
        throw new GraphQLYogaError("Email Taken");
      }

      user.email = data.email;
    }

    if (typeof data.title === "string") {
      post.title = data.title;
    }

    if (typeof data.body === "string") {
      post.body = data.body;
    }

    if (typeof data.published === "boolean") {
      post.published = data.published;
    }

    if (typeof data.author === "string") {
      post.author = data.author;
    }

    return post;
  },
  createComment(parent, args, ctx, info) {
    const userExists = db.users.some((user) => user.id === args.data.author);

    if (!userExists) {
      throw new GraphQLYogaError("User not found");
    }

    const postExists = db.posts.some(
      (post) => post.id === args.data.post && post.published
    );

    if (!postExists) {
      throw new GraphQLYogaError("Comment not found");
    }

    const comment = {
      id: uuidv4(),
      ...args.data,
    };

    db.comments.push(comment);

    return comment;
  },
  deleteComment(parent, args, { db }, info) {
    const commentIndex = db.comments.findIndex(
      (comment) => comment.id === args.id
    );

    if (commentIndex === -1) {
      throw new GraphQLYogaError("Comment not found");
    }

    const deletedComment = db.comments.splice(commentIndex, 1);

    db.comments = db.comments.filter((comment) => comment.id !== args.id);

    return deletedComment[0];
  },
};

export { Mutation as default };

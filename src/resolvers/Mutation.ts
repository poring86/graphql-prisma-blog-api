import { GraphQLYogaError } from "@graphql-yoga/node";

import { User, Comment, Post } from "../types/global";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

const Mutation = {
  async createUser(
    _parent: any,
    args: { data: User },
    { prisma }: any,
    _info: any
  ) {
    try {
      await prisma.user.create({
        data: {
          ...args.data,
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new GraphQLYogaError("Email Taken");
        }
      }
    }
  },
  async deleteUser(
    _parent: any,
    args: { id: string },
    { prisma }: any,
    _info: any
  ) {
    try {
      return await prisma.user.delete({
        where: {
          id: args.id,
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new GraphQLYogaError("User not found");
        }
      }
    }
  },
  async updateUser(
    _parent: any,
    args: { id: string; data: User },
    { prisma }: any,
    _info: any
  ) {
    const { id, data } = args;
    try {
      return await prisma.user.update({
        where: {
          id: id,
        },
        data,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new GraphQLYogaError("User not found");
        }
        if (e.code === "P2002") {
          throw new GraphQLYogaError("Email Taken");
        }
      }
    }
  },
  async createPost(
    _parent: any,
    args: { data: Post },
    { pubsub, prisma }: any,
    _info: any
  ) {
    try {
      const post = await prisma.post.create({
        data: {
          title: args.data.title,
          body: args.data.body,
          published: args.data.published,
          userId: args.data.author,
        },
      });

      if (args.data.published) {
        pubsub.publish("post", {
          post: {
            mutation: "CREATED",
            data: post,
          },
        });
      }

      return post;
    } catch (e) {
      console.log("error", e);
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2003") {
          throw new GraphQLYogaError("User not found");
        }
      }
    }
  },
  async deletePost(
    _parent: any,
    args: { id: string },
    { pubsub, prisma }: any,
    _info: any
  ) {
    try {
      const post = await prisma.post.delete({
        where: {
          id: args.id,
        },
      });

      if (post.published) {
        pubsub.publish("post", {
          post: {
            mutation: "DELETED",
            data: post,
          },
        });
      }

      return post;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new GraphQLYogaError("Post not found");
        }
      }
    }
  },
  async updatePost(
    _parent: any,
    args: { id: string; data: Post },
    { pubsub, prisma }: any,
    _info: any
  ) {
    const { id, data } = args;

    let post = await prisma.post.findUnique({
      where: {
        id: args.id,
      },
    });

    const originalPost = { ...post };

    if (!post) {
      throw new GraphQLYogaError("Post not found");
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

    try {
      post = await prisma.post.update({
        where: {
          id: id,
        },
        post,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new GraphQLYogaError("Post not found");
        }
      }
    }

    if (typeof data.published !== "boolean" && post.published) {
      pubsub.publish("post", {
        post: {
          mutation: "UPDATED",
          data: post,
        },
      });
    } else if (originalPost.published && !post.published) {
      pubsub.publish("post", {
        post: {
          mutation: "DELETED",
          data: originalPost,
        },
      });
    } else if (!originalPost.published && post.published) {
      pubsub.publish("post", {
        post: {
          mutation: "CREATED",
          data: post,
        },
      });
    } else if (originalPost.published && post.published) {
      pubsub.publish("post", {
        post: {
          mutation: "UPDATED",
          data: post,
        },
      });
    }

    return post;
  },
  async createComment(
    _parent: any,
    args: { data: any },
    { pubsub, prisma }: any,
    _info: any
  ) {
    try {
      const comment = await prisma.comment.create({
        data: {
          text: args.data.text,
          userId: args.data.author,
          postId: args.data.post,
        },
      });

      pubsub.publish(`comment ${args.data.post}`, {
        comment: {
          mutation: "CREATED",
          data: comment,
        },
      });

      return comment;
    } catch (e) {
      console.log("erro", e);

      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2003") {
          throw new GraphQLYogaError("Not found");
        }
      }
    }
  },
  async deleteComment(
    _parent: any,
    args: { id: string },
    { pubsub, prisma }: any,
    _info: any
  ) {
    try {
      const comment = await prisma.comment.delete({
        where: {
          id: args.id,
        },
      });
      pubsub.publish(`comment ${comment.post}`, {
        comment: {
          mutation: "DELETED",
          data: comment,
        },
      });

      return comment;
    } catch (e) {
      console.log("erro", e);
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new GraphQLYogaError("Comment not found");
        }
      }
    }
  },
  updateComment(
    _parent: any,
    args: { id: string; data: Comment },
    { db, pubsub }: any,
    _info: any
  ) {
    const { id, data } = args;
    const comment = db.comments.find((comment: Comment) => comment.id === id);

    if (!comment) {
      throw new GraphQLYogaError("Comment not found");
    }

    if (typeof data.text === "string") {
      comment.text = data.text;
    }

    pubsub.publish(`comment ${comment.post}`, {
      comment: {
        mutation: "UPDATED",
        data: comment,
      },
    });

    return comment;
  },
};

export { Mutation as default };

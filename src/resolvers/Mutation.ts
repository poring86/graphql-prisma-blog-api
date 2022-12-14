import { GraphQLYogaError } from "@graphql-yoga/node";
import { compare } from "bcryptjs";

import {
    CreateCommentInput,
    UpdateCommentInput,
    CreateUserInput,
    UpdateUserInput,
    CreatePostInput,
    UpdatePostInput,
} from "../types/global";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

import { generateToken, getUserId, hashedPassword } from "../utils";

const Mutation = {
    async createUser(
        _parent: unknown,
        { data }: { data: CreateUserInput },
        { prisma }: any,
        _info: unknown
    ) {
        const password = await hashedPassword(data.password);

        try {
            const user = await prisma.user.create({
                data: {
                    ...data,
                    password,
                },
            });

            const token = generateToken(user.id);

            return {
                user,
                token,
            };
        } catch (e) {
            console.log("error", e);
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2002") {
                    throw new GraphQLYogaError("Email Taken");
                }
            }
        }
    },
    async deleteUser(
        _parent: unknown,
        _args: unknown,
        { prisma, request }: any,
        _info: unknown
    ) {
        const userId = getUserId(request);
        try {
            return await prisma.user.delete({
                where: {
                    id: userId,
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
        _parent: unknown,
        { data }: { data: UpdateUserInput },
        { prisma, request }: any,
        _info: unknown
    ) {
        const userId = getUserId(request);
        try {
            return await prisma.user.update({
                where: {
                    id: userId,
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
        _parent: unknown,
        { data }: { data: CreatePostInput },
        { pubsub, prisma, request }: any,
        _info: unknown
    ) {
        const userId = getUserId(request);
        try {
            const post = await prisma.post.create({
                data: {
                    ...data,
                    userId,
                },
            });

            if (data.published) {
                pubsub.publish("post", {
                    post: {
                        mutation: "CREATED",
                        data: post,
                    },
                });
            }

            return post;
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2003") {
                    throw new GraphQLYogaError("User not found");
                }
            }
        }
    },
    async deletePost(
        _parent: unknown,
        { id }: { id: string },
        { pubsub, prisma }: any,
        _info: unknown
    ) {
        try {
            const post = await prisma.post.delete({
                where: {
                    id,
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
        _parent: unknown,
        { id, data }: { id: string; data: UpdatePostInput },
        { pubsub, prisma }: any,
        _info: unknown
    ) {
        let post = await prisma.post.findUnique({
            where: {
                id,
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
                    id,
                },
                data,
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
        _parent: unknown,
        { data }: { data: CreateCommentInput },
        { pubsub, prisma, request }: any,
        _info: unknown
    ) {
        const userId = getUserId(request);
        try {
            const comment = await prisma.comment.create({
                data: {
                    ...data,
                    userId,
                },
            });

            pubsub.publish(`comment ${data.post}`, {
                comment: {
                    mutation: "CREATED",
                    data: comment,
                },
            });

            return comment;
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2003") {
                    throw new GraphQLYogaError("Not found");
                }
            }
        }
    },
    async deleteComment(
        _parent: unknown,
        { id }: { id: string },
        { pubsub, prisma }: any,
        _info: unknown
    ) {
        try {
            const comment = await prisma.comment.delete({
                where: {
                    id,
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
            console.log(e);
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2025") {
                    throw new GraphQLYogaError("Comment not found");
                }
            }
        }
    },
    async updateComment(
        _parent: unknown,
        args: { id: string; data: UpdateCommentInput },
        { pubsub, prisma }: any,
        _info: unknown
    ) {
        try {
            const comment = await prisma.comment.update({
                where: {
                    id: args.id,
                },
                data: args.data,
            });

            pubsub.publish(`comment ${comment.post}`, {
                comment: {
                    mutation: "UPDATED",
                    data: comment,
                },
            });

            return comment;
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2025") {
                    throw new GraphQLYogaError("Comment not found");
                }
            }
        }
    },
    async login(
        _parent: unknown,
        { data }: any,
        { prisma }: any,
        _info: unknown
    ) {
        const user = await prisma.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if (!user) {
            throw new GraphQLYogaError("User not found");
        }

        const passwordValid = await compare(data.password, user.password);

        if (!passwordValid) {
            throw new GraphQLYogaError("Invalid password");
        }

        const token = generateToken(user.id);

        return {
            token,
            user,
        };
    },
};

export { Mutation as default };

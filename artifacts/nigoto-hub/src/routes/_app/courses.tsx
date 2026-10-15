import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/courses")({ component: () => <Outlet /> });

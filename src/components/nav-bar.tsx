import { TooltipContentProps } from "@radix-ui/react-tooltip"
import { useAtom } from "jotai"
import React from "react"
import {
  NavLinkProps,
  NavLink as RouterNavLink,
  useLocation,
  useMatch,
  useNavigate,
  useResolvedPath,
} from "react-router-dom"
import { useEvent, useNetworkState } from "react-use"
import { globalStateMachineAtom } from "../global-state"
import { cx } from "../utils/cx"
import { toDateString } from "../utils/date"
import { getPrevPathParams, savePathParams } from "../utils/prev-path-params"
import { DropdownMenu } from "./dropdown-menu"
import { useSignOut } from "./github-auth"
import { IconButton } from "./icon-button"
import {
  CalendarFillIcon24,
  CalendarIcon24,
  MoreIcon24,
  NoteFillIcon24,
  NoteIcon24,
  TagFillIcon24,
  TagIcon24,
} from "./icons"
import { NewNoteDialog } from "./new-note-dialog"
import { Tooltip } from "./tooltip"
import { SyncStatus } from "./sync-status"

export function NavBar({ position }: { position: "left" | "bottom" }) {
  const [state, send] = useAtom(globalStateMachineAtom)
  const navigate = useNavigateWithCache()
  const signOut = useSignOut()
  const { online } = useNetworkState()

  // Open tooltips on the side opposite to the nav bar.
  const tooltipSide = ({ left: "right", bottom: "top" } as const)[position]

  useEvent("keydown", (event: KeyboardEvent) => {
    // Navigate to settings page with `command + ,`
    if (event.key === "," && event.metaKey) {
      navigate("/settings")
      event.preventDefault()
    }
  })

  return (
    <nav
      className={cx(
        "w-full border-border-secondary",
        // Add a border separating the nav bar from the main content.
        { left: "border-r", bottom: "border-t" }[position],
      )}
    >
      <ul
        className={cx("flex p-2", { left: "h-full flex-col gap-2", bottom: "flex-row" }[position])}
      >
        <li className={cx({ left: "flex-grow-0", bottom: "flex-grow" }[position])}>
          <NavLink to="/" aria-label="Notes" tooltipSide={tooltipSide} end>
            {({ isActive }) => (isActive ? <NoteFillIcon24 /> : <NoteIcon24 />)}
          </NavLink>
        </li>
        <li className={cx({ left: "flex-grow-0", bottom: "flex-grow" }[position])}>
          <NavLink
            to={`/${toDateString(new Date())}`}
            aria-label="Today"
            tooltipSide={tooltipSide}
            end
          >
            {({ isActive }) =>
              isActive ? (
                <CalendarFillIcon24 date={new Date().getDate()} />
              ) : (
                <CalendarIcon24 date={new Date().getDate()} />
              )
            }
          </NavLink>
        </li>
        <li className={cx({ left: "flex-grow-0", bottom: "flex-grow" }[position])}>
          <NavLink to="/tags" aria-label="Tags" tooltipSide={tooltipSide} end>
            {({ isActive }) => (isActive ? <TagFillIcon24 /> : <TagIcon24 />)}
          </NavLink>
        </li>
        <li className={cx({ left: "flex-grow-0", bottom: "flex-grow" }[position])}>
          <NewNoteDialog.Trigger className="w-full" tooltipSide={tooltipSide} />
        </li>
        <li className="mt-auto">
          <IconButton disableTooltip>
            <div style={{ width: 24, height: 24, display: "grid", placeItems: "center" }}>
              <SyncStatus />
            </div>
          </IconButton>
        </li>
        <li className={cx({ left: "flex-grow-0", bottom: "flex-grow" }[position])}>
          <DropdownMenu modal={false}>
            <DropdownMenu.Trigger asChild>
              {/* TODO: Focus button when dialog closes. */}
              <IconButton aria-label="More actions" disableTooltip className="w-full">
                <MoreIcon24 />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side={tooltipSide} align="end">
              <DropdownMenu.Item onClick={signOut}>Sign out</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                href="https://github.com/colebemis/lumen/issues/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                Share feedback
              </DropdownMenu.Item>
              <DropdownMenu.Item
                href="https://lumen-notes.github.io/lumen"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </DropdownMenu.Item>
              <DropdownMenu.Item
                href="https://lumen-notes.github.io/lumen/keyboard-shortcuts"
                target="_blank"
                rel="noopener noreferrer"
              >
                Keyboard shortcuts
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={() => send({ type: "SYNC" })} disabled={!online}>
                {state.matches("signedIn.cloned.sync") &&
                !state.matches("signedIn.cloned.sync.idle")
                  ? "Syncing…"
                  : "Sync"}
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => navigate("/settings")} shortcut={["⌘", ","]}>
                Settings
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </li>
      </ul>
    </nav>
  )
}

function NavLink({
  tooltipSide,
  ...props
}: Omit<NavLinkProps, "to"> & { to: string; tooltipSide?: TooltipContentProps["side"] }) {
  const navigate = useNavigateWithCache()
  const path = useResolvedPath(props.to)
  const match = useMatch({
    path: path.pathname,
    end: props.end,
    caseSensitive: props.caseSensitive,
  })
  const isActive = match !== null

  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <RouterNavLink
          className={cx(
            "focus-ring inline-flex w-full justify-center rounded-sm p-2 hover:bg-bg-secondary coarse:p-3",
            isActive ? "text-text" : "text-text-secondary",
          )}
          {...props}
          onClick={(event) => {
            event.preventDefault()
            navigate(props.to)
          }}
        />
      </Tooltip.Trigger>
      <Tooltip.Content side={tooltipSide}>{props["aria-label"]}</Tooltip.Content>
    </Tooltip>
  )
}

function useNavigateWithCache() {
  const navigate = useNavigate()
  const location = useLocation()

  return React.useCallback(
    (to: string) => {
      const pathname = to.split("?")[0]

      // Save the params for the current path before navigating
      savePathParams(location)

      const prevPathParams = getPrevPathParams(pathname)

      // Clicking the nav link for the current page resets the params for that pages
      if (location.pathname === pathname) {
        navigate(to)
        return
      }

      if (prevPathParams) {
        // Navigate to the new path with the previous params for that path
        navigate({ pathname, search: prevPathParams })
      } else {
        navigate(to)
      }
    },
    [navigate, location],
  )
}

// ESM-Adapter: stellt das global geladene React als Modul bereit.
const React = window.React;
export default React;
export const {
  useState, useEffect, useRef, useCallback, useMemo,
  useContext, createContext, createElement, Fragment, memo
} = React;

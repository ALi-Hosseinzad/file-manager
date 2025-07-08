import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Content from "./components/Content";
import "./App.css";

const initialTree = {
  id: "root",
  name: "root",
  type: "folder",
  children: [
    {
      id: "1",
      name: "src",
      type: "folder",
      children: [
        { id: "1-1", name: "App.js", type: "file" },
        { id: "1-2", name: "components", type: "folder", children: [] },
        { id: "1-3", name: "index.js", type: "file" },
      ],
    },
    {
      id: "2",
      name: "package.json",
      type: "file",
    },
    {
      id: "3",
      name: "public",
      type: "folder",
      children: [
        { id: "3-1", name: "favicon.ico", type: "file" },
        { id: "3-2", name: "index.html", type: "file" },
      ],
    },
  ],
};

function App() {
  // State برای ساختار درختی
  const [treeData, setTreeData] = useState(initialTree);
  //برای هاور
  const [hoveredId, setHoveredId] = useState(null);

  // فولدرهای باز شده (Set از id فولدرها)
  const [expandedFolders, setExpandedFolders] = useState(new Set(["root"]));

  // id آیتم انتخاب شده
  const [selectedId, setSelectedId] = useState(null);

  // مسیر کامل آیتم انتخاب شده (string)
  const [selectedPath, setSelectedPath] = useState("");

  // مدیریت Context Menu
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    node: null, // نود مربوط به کانتکست منو
  });

  // کمک برای پیدا کردن مسیر کامل از id انتخاب شده
  function findPathById(node, id, path = []) {
    if (node.id === id) return [...path, node.name];
    if (node.type === "folder" && node.children) {
      for (let child of node.children) {
        const result = findPathById(child, id, [...path, node.name]);
        if (result) return result;
      }
    }
    return null;
  }

  // وقتی selectedId تغییر کنه مسیر رو بروز کن
  useEffect(() => {
    if (!selectedId) {
      setSelectedPath("");
      return;
    }
    const pathArr = findPathById(treeData, selectedId);
    if (pathArr) setSelectedPath(pathArr.join("/"));
  }, [selectedId, treeData]);

  // توابع کمکی برای باز و بسته کردن فولدر
  function toggleFolder(id) {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }
  function handleAddEvent(e) {
    const { type, name } = e.detail;
    const selectedNode = findNodeById(treeData, selectedId);
    if (!selectedNode) return;

    const path = name.split("/").filter(Boolean);

    let parent = selectedNode;
    if (selectedNode.type === "file") {
      // فایل انتخاب شده → والد آن فولدر است
      const parentResult = findNodeAndParent(treeData, selectedId);
      parent = parentResult?.parent;
    }

    if (!parent || parent.type !== "folder") return;

    // بررسی وجود مسیر
    const updatedTree = addNodeByPath(treeData, parent.id, path, type);
    if (updatedTree.error) {
      alert("file/folder already existed");
      return;
    }
    setTreeData(updatedTree.newTree);
  }

  // توابع افزودن، ویرایش، حذف که در ادامه کامل میشن

  // بستن Context Menu
  function closeContextMenu() {
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  }

  // گوش دادن به کلیک در صفحه برای بستن کانتکست منو
  useEffect(() => {
    function handleClick() {
      closeContextMenu();
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // شورتکات ها (Ctrl+n, Delete, F2)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleAddNew();
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === "F2") {
        e.preventDefault();
        handleRenameSelected();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, treeData]);
  useEffect(() => {
    function handleRenameEvent(e) {
      const { id, newName } = e.detail;
      const { node, parent } = findNodeAndParent(treeData, id);
      if (!node || !parent) return;
      if (nameExistsInFolder(parent, newName)) {
        alert("file/folder already existed");
        return;
      }
      setTreeData((prev) => updateTreeData({ name: newName }, id, "edit"));
    }

    function handleDeleteEvent(e) {
      const { id } = e.detail;
      if (id === "root") return;
      setTreeData((prev) => updateTreeData(null, id, "delete"));
      if (selectedId === id) setSelectedId(null);
    }

    window.addEventListener("rename-node", handleRenameEvent);
    window.addEventListener("delete-node", handleDeleteEvent);
    window.addEventListener("add-node", handleAddEvent);

    return () => {
      window.removeEventListener("rename-node", handleRenameEvent);
      window.removeEventListener("delete-node", handleDeleteEvent);
      window.removeEventListener("add-node", handleAddEvent);
    };
  }, [treeData, selectedId]);
  // Helper: پیدا کردن نود و والدش بر اساس id
  function findNodeAndParent(node, id, parent = null) {
    if (node.id === id) return { node, parent };
    if (node.type === "folder" && node.children) {
      for (let child of node.children) {
        const result = findNodeAndParent(child, id, node);
        if (result) return result;
      }
    }
    return null;
  }

  // مرتب سازی children: فولدرها اول، بعد فایل‌ها، هر دو به ترتیب الفبا
  function sortChildren(children) {
    return [...children].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // آپدیت ساختار درخت به صورت immutable
  function updateTreeData(newNode, id, action) {
    function recursiveUpdate(node) {
      if (node.id === id) {
        if (action === "edit") return { ...node, ...newNode };
        if (action === "delete") return null;
        if (action === "add") {
          if (node.type !== "folder") return node;
          const newChildren = node.children
            ? [...node.children, newNode]
            : [newNode];
          return { ...node, children: sortChildren(newChildren) };
        }
      }
      if (node.type === "folder" && node.children) {
        const updatedChildren = node.children
          .map((child) => recursiveUpdate(child))
          .filter((child) => child !== null);
        return { ...node, children: sortChildren(updatedChildren) };
      }
      return node;
    }
    return recursiveUpdate(treeData);
  }

  // بررسی وجود نام در یک فولدر
  function nameExistsInFolder(folderNode, name) {
    if (!folderNode.children) return false;
    return folderNode.children.some((child) => child.name === name);
  }

  // افزودن آیتم جدید با پشتیبانی مسیر (path)
  function addNodeByPath(path, type) {
    const parts = path.split("/");
    if (parts.length === 0) return false;

    // کلید برای ساختن یک id ساده (میتونیم به شکل پیشرفته‌تر بسازیم)
    function generateId() {
      return Math.random().toString(36).substr(2, 9);
    }

    function recursiveAdd(node, parts) {
      if (parts.length === 0) return node;
      const [currentName, ...restParts] = parts;
      if (node.type !== "folder") return node;

      let child = node.children?.find((c) => c.name === currentName);
      if (!child) {
        child = {
          id: generateId(),
          name: currentName,
          type: restParts.length === 0 ? type : "folder",
          children: restParts.length === 0 ? undefined : [],
        };
        node.children = [...(node.children || []), child];
        node.children = sortChildren(node.children);
      } else {
        // اگر نام موجود باشد و ادامه مسیر داریم اما child فایل بود → خطا
        if (restParts.length > 0 && child.type === "file") {
          alert("file/folder already existed");
          return node;
        }
      }
      // ادامه مسیر روی child
      const updatedChild = recursiveAdd(child, restParts);
      node.children = node.children.map((c) =>
        c.id === updatedChild.id ? updatedChild : c
      );
      return node;
    }

    // برای بروز رسانی treeData باید deep clone کنیم
    function deepClone(node) {
      if (!node) return null;
      return {
        ...node,
        children: node.children
          ? node.children.map((child) => deepClone(child))
          : undefined,
      };
    }

    const newTree = deepClone(treeData);
    recursiveAdd(newTree, parts);
    setTreeData(newTree);
  }

  // عملکرد افزودن با prompt و انتخاب فولدر یا فایل
  function handleAddNew() {
    if (!selectedId) {
      alert("No folder selected for adding");
      return;
    }
    const { node: selectedNode, parent } =
      findNodeAndParent(treeData, selectedId) || {};
    let targetFolder = selectedNode;
    if (!selectedNode) return;
    if (selectedNode.type === "file") {
      if (!parent) {
        alert("Cannot add to root file");
        return;
      }
      targetFolder = parent;
    }
    const path = prompt("Enter name or path to add (e.g. src/hooks/test.js)");
    if (!path) return;

    // بررسی وجود فایل یا فولدر با همان نام در مسیر والد
    if (nameExistsInFolder(targetFolder, path.split("/")[0])) {
      alert("file/folder already existed");
      return;
    }
    addNodeByPath(path, "file"); // فرض کنیم فایل می‌سازیم، برای فولدر باید مکانیزم انتخاب داشته باشیم (می‌تونیم prompt یا فرم اضافه کنیم)
  }

  // عملکرد حذف آیتم انتخاب شده
  function handleDeleteSelected() {
    if (!selectedId || selectedId === "root") {
      alert("No item selected or cannot delete root");
      return;
    }
    setTreeData((prevTree) => updateTreeData(null, selectedId, "delete"));
    setSelectedId(null);
  }

  // عملکرد ویرایش نام آیتم انتخاب شده
  function handleRenameSelected() {
    if (!selectedId || selectedId === "root") {
      alert("No item selected or cannot rename root");
      return;
    }
    const { node, parent } = findNodeAndParent(treeData, selectedId);
    if (!node || !parent) return;

    const newName = prompt("Enter new name", node.name);
    if (!newName || newName === node.name) return;

    if (nameExistsInFolder(parent, newName)) {
      alert("file/folder already existed");
      return;
    }

    setTreeData((prevTree) =>
      updateTreeData({ name: newName }, selectedId, "edit")
    );
  }

  return (
    <div className="wrapper">
      <Sidebar
        treeData={treeData}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        setContextMenu={setContextMenu}
        onRename={handleRenameSelected}
        onDelete={handleDeleteSelected}
        setHoveredId={setHoveredId}
        hoveredId={hoveredId}
      />
      <Content selectedPath={selectedPath} />

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={closeContextMenu}
          onRename={handleRenameSelected}
          onDelete={handleDeleteSelected}
          onAddFolder={() => {
            const node = contextMenu.node;
            if (!node) return;
            let targetFolder = node;
            if (node.type === "file") {
              const { parent } = findNodeAndParent(treeData, node.id) || {};
              if (!parent) return;
              targetFolder = parent;
            }
            const path = prompt("Enter folder name or path to add");
            if (!path) return;
            // بررسی تکراری بودن
            if (nameExistsInFolder(targetFolder, path.split("/")[0])) {
              alert("file/folder already existed");
              return;
            }
            addNodeByPath(path, "folder");
            closeContextMenu();
          }}
          onAddFile={() => {
            const node = contextMenu.node;
            if (!node) return;
            let targetFolder = node;
            if (node.type === "file") {
              const { parent } = findNodeAndParent(treeData, node.id) || {};
              if (!parent) return;
              targetFolder = parent;
            }
            const path = prompt("Enter file name or path to add");
            if (!path) return;
            if (nameExistsInFolder(targetFolder, path.split("/")[0])) {
              alert("file/folder already existed");
              return;
            }
            addNodeByPath(path, "file");
            closeContextMenu();
          }}
        />
      )}
    </div>
  );
}

function ContextMenu({
  x,
  y,
  node,
  onClose,
  onRename,
  onDelete,
  onAddFolder,
  onAddFile,
}) {
  function handleContextMenu(e) {
    e.preventDefault();
  }

  return (
    <ul
      className="context-menu"
      onContextMenu={handleContextMenu}
      style={{
        position: "fixed",
        top: y,
        left: x,
        backgroundColor: "#1a1a1a",
        padding: 0,
        margin: 0,
        listStyle: "none",
        zIndex: 1000,
        minWidth: 150,
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      }}
    >
      <li
        className="context-menu-item"
        onClick={() => {
          onRename();
          onClose();
        }}
        style={{ padding: "8px", cursor: "pointer" }}
      >
        Rename
      </li>
      {node.type === "folder" && (
        <>
          <li
            className="context-menu-item"
            onClick={() => {
              onAddFolder();
              onClose();
            }}
            style={{ padding: "8px", cursor: "pointer" }}
          >
            Folder Add
          </li>
          <li
            className="context-menu-item"
            onClick={() => {
              onAddFile();
              onClose();
            }}
            style={{ padding: "8px", cursor: "pointer" }}
          >
            File Add
          </li>
        </>
      )}
      <li
        className="context-menu-item"
        onClick={() => {
          onDelete();
          onClose();
        }}
        style={{ padding: "8px", cursor: "pointer", color: "red" }}
      >
        Delete
      </li>
    </ul>
  );
}

export default App;

import styles from "./Sidebar.module.css";
import Expand from "../assets/arrow-down.svg";
import Delete from "../assets/delete.svg";
import Edit from "../assets/edit.svg";
import NotExpand from "../assets/arrow-right.svg";
import AddFile from "../assets/add-file.svg";
import AddFolder from "../assets/add-folder.svg";

function Sidebar({
  treeData,
  expandedFolders,
  toggleFolder,
  setHoveredId,
  hoveredId,
  setSelectedId,
  setContextMenu,
}) {
  function renderNode(node) {
    const isFolder = node.type === "folder";
    const isExpanded = expandedFolders.has(node.id);
    let children = [];
    if (isFolder && isExpanded && node.children) {
      children = sortChildren(node.children);
    }

    return (
      <div key={node.id} style={{ paddingLeft: 20 }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isFolder) toggleFolder(node.id);
            setSelectedId(node.id);
          }}
          onMouseEnter={() => setHoveredId(node.id)}
          onMouseLeave={() => setHoveredId(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectedId(node.id);
            setContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              node: node,
            });
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 8px",
            userSelect: "none",
            position: "relative",
          }}
          className="sidebar-node"
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              {isFolder && (
                <span style={{ marginRight: 5 }}>
                  {isExpanded ? (
                    <img src={Expand} alt="📂" width={16} height={16} />
                  ) : (
                    <img src={NotExpand} alt="📁" width={16} height={16} />
                  )}
                </span>
              )}
              {!isFolder && <span style={{ marginRight: 5 }}>📄</span>}
              <span>{node.name}</span>
            </div>

            {hoveredId === node.id && node.id !== "root" && (
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt("Enter new name", node.name);
                    if (!newName || newName === node.name) return;
                    const renameEvent = new CustomEvent("rename-node", {
                      detail: { id: node.id, newName },
                    });
                    window.dispatchEvent(renameEvent);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <img src={Edit} alt="#" width={16} height={16} />
                </span>
                <span
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    const confirmDelete = window.confirm(
                      "Are you sure to delete?"
                    );
                    if (confirmDelete) {
                      const deleteEvent = new CustomEvent("delete-node", {
                        detail: { id: node.id },
                      });
                      window.dispatchEvent(deleteEvent);
                    }
                  }}
                  style={{ cursor: "pointer", color: "red" }}
                >
                  <img src={Delete} alt="#" width={16} height={16} />
                </span>
              </div>
            )}
          </div>
        </div>
        {isExpanded &&
          children.map((child) => (
            <div key={child.id}>{renderNode(child)}</div>
          ))}
      </div>
    );
  }

  function sortChildren(children) {
    return [...children].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  return (
    <div className={styles.wrapper}>
      <div style={{ display: "flex", gap: 8 }}>
        <input></input>
        <span
          title="Rename"
          onClick={(e) => {
            const name = prompt("Enter folder name (e.g. src/hooks):");
            if (name) {
              const addEvent = new CustomEvent("add-node", {
                detail: { type: "folder", name },
              });
              window.dispatchEvent(addEvent);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <img src={AddFolder} alt="#" width={16} height={16} />
        </span>
        <span
          title="Delete"
          onClick={() => {
            const name = prompt("Enter file name (e.g. test.js):");
            if (name) {
              const addEvent = new CustomEvent("add-node", {
                detail: { type: "file", name },
              });
              window.dispatchEvent(addEvent);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <img src={AddFile} alt="#" width={16} height={16} />
        </span>
      </div>
      {renderNode(treeData)}
    </div>
  );
}

export default Sidebar;

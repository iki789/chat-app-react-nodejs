import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from "react-virtualized";

const LINE_HEIGHT = 22;
const BUBBLE_PADDING_VERTICAL = 32; // 1rem top + 1rem bottom
const VERTICAL_GAP = 8;

function estimateHeight(message, containerWidth) {
  if (!message || containerWidth === 0) return 60;
  const charsPerLine = Math.floor((containerWidth * 0.45) / 8);
  const lines = Math.ceil(String(message).length / (charsPerLine || 50));
  return Math.max(1, lines) * LINE_HEIGHT + BUBBLE_PADDING_VERTICAL + VERTICAL_GAP;
}

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const listRef = useRef();

  const cache = useRef(
    new CellMeasurerCache({
      fixedWidth: true,   // width is fixed per container, only height varies
      defaultHeight: 60,
    })
  );

  useEffect(() => {
    const getMessages = async () => {
      const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
      const response = await axios.post(recieveMessageRoute, {
        from: data._id,
        to: currentChat._id,
      });
      setMessages(response.data);
    };
    getMessages();
  }, [currentChat]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (msg) => {
        setArrivalMessage({ fromSelf: false, message: msg });
      });
    }
  }, [socket]);

  useEffect(() => {
    if (arrivalMessage) setMessages((prev) => [...prev, arrivalMessage]);
    listRef.current.scrollToRow(messages.length - 1)
  }, [arrivalMessage]);

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      // Clear cache for new message so it gets measured fresh
      cache.current.clear(messages.length - 1, 0);
      listRef.current.recomputeRowHeights(messages.length - 1);
      listRef.current.scrollToRow(messages.length - 1);
    }
  }, [messages.length]);

  const rowRenderer = ({ index, key, parent, style }) => {
    const msg = messages[index];
    return (
      <CellMeasurer
        key={key}
        cache={cache.current}
        parent={parent}
        columnIndex={0}
        rowIndex={index}
      >
        {({ measure, registerChild }) => (
          <div ref={registerChild} style={style}>
            <div className={`message ${msg.fromSelf ? "sended" : "recieved"}`}>
              <div className="content" onLoad={measure}>
                <p>{String(msg.message)}</p>
              </div>
            </div>
          </div>
        )}
      </CellMeasurer>
    );
  };

  const handleSendMsg = async (msg) => {
    const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    socket.current.emit("send-msg", { to: currentChat._id, from: data._id, msg });
    await axios.post(sendMessageRoute, { from: data._id, to: currentChat._id, message: msg });
    setMessages((prev) => [...prev, { fromSelf: true, message: msg }]);
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt="" />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
          </div>
        </div>
        <Logout />
      </div>
      <div className="chat-messages">
        <AutoSizer>
          {({ width, height }) => (
            <List
              ref={listRef}
              width={width}
              height={height}
              rowCount={messages.length}
              rowHeight={cache.current.rowHeight}
              rowRenderer={rowRenderer}
              deferredMeasurementCache={cache.current}
            />
          )}
        </AutoSizer>
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}

function Message({ index, style, messages }) {
  const message = messages[index];
  if (!message) return null;
  return (
    <div style={style}>
      <div className={`message ${message.fromSelf ? "sended" : "recieved"}`}>
        <div className="content">
          <p>{String(message.message)}</p>
        </div>
      </div>
    </div>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  height: 100%;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    overflow: hidden;
    height: 100%;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: flex-start;
      margin-bottom: 0.5rem;
      .content {
        max-width: 50%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1rem;
        line-height: 22px;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 920px) and (max-width: 1080px) {
          max-width: 40%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }
  }
`;
import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { VariableSizeList as List } from "react-window";
import { prepare, layout } from "@chenglou/pretext";

const FONT_SPEC = "16px 'Josefin Sans', sans-serif";
const LINE_HEIGHT = 22; // Matches font-size: 1rem (16px) with typical leading
const BUBBLE_PADDING_VERTICAL = 32; // 1rem top + 1rem bottom
const BUBBLE_PADDING_HORIZONTAL = 32; // 1rem left + 1rem right
const VERTICAL_GAP = 12; // Consistent gap between bubbles

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const listRef = useRef();
  const containerRef = useRef();

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const getMessages = async () => {
      const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
      const response = await axios.post(recieveMessageRoute, {
        from: data._id,
        to: currentChat._id,
      });
      const preparedMessages = response.data.map((msg) => ({
        ...msg,
        handle: prepare(String(msg.message), FONT_SPEC),
      }));
      setMessages(preparedMessages);
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
    if (arrivalMessage) {
      const prepared = {
        ...arrivalMessage,
        handle: prepare(String(arrivalMessage.message), FONT_SPEC),
      };
      setMessages((prev) => [...prev, prepared]);
    }
  }, [arrivalMessage]);

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, "end");
    }
  }, [messages]);

  const getItemSize = useCallback(
    (index) => {
      const msg = messages[index];
      if (!msg || containerWidth === 0) return 60;
      
      const maxWidth = containerWidth * 0.5 - BUBBLE_PADDING_HORIZONTAL;
      const { height } = layout(msg.handle, maxWidth, LINE_HEIGHT);
      return height + BUBBLE_PADDING_VERTICAL + VERTICAL_GAP;
    },
    [messages, containerWidth]
  );

  const handleSendMsg = async (msg) => {
    const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    socket.current.emit("send-msg", { to: currentChat._id, from: data._id, msg });
    await axios.post(sendMessageRoute, { from: data._id, to: currentChat._id, message: msg });
    const prepared = {
      fromSelf: true,
      message: msg,
      handle: prepare(String(msg), FONT_SPEC),
    };
    setMessages((prev) => [...prev, prepared]);
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
      <div className="chat-messages" ref={containerRef}>
        {containerWidth > 0 && messages.length > 0 && (
          <List
            ref={listRef}
            height={containerHeight}
            width={containerWidth}
            itemCount={messages.length}
            itemSize={getItemSize}
            itemData={messages}
          >
            {({ index, style, data }) => (
              <Message index={index} style={style} messages={data} />
            )}
          </List>
        )}
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
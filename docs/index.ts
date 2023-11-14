import { spider, act } from "../mod.ts";

const { h, useState, useEffect } = act;

const Greeting = () => {
  const [greetingIndex, setGreetingIndex] = useState(0)
  const greetings = [
    "Hello",
    "Welcome",
    "Hiya",
    "Hey-ho"
  ]
  useEffect(() => {
    const id = setInterval(() => {
      setGreetingIndex(i => i + 1)
    }, 1000)
    return () => {
      clearInterval(id);
    };
  }, []);

  return greetings[greetingIndex % greetings.length];
};

const App = () => {
  return h(spider.div, { style: '' }, [h(Greeting), ' ', 'from web!']);
};

spider.createWebRenderer(document.body, h(App));

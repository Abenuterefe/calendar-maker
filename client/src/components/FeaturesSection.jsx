import React from 'react';
import { FaCalendarPlus, FaRedoAlt, FaSearch, FaMicrophoneAlt, FaBrain } from 'react-icons/fa'; // Changed FaRocket to FaBrain for AI

const FeaturesSection = () => {
  const features = [
    {
      icon: <FaCalendarPlus className="text-5xl text-primary mb-4 mx-auto" />,
      title: "Effortless Event Creation",
      description: "Schedule one-time events with simple voice or text commands. Our AI handles the parsing.",
    },
    {
      icon: <FaRedoAlt className="text-5xl text-accent mb-4 mx-auto" />,
      title: "Smart Recurring Events",
      description: "Set up daily, weekly, or custom recurring events seamlessly. Stay organized, effortlessly.",
    },
    {
      icon: <FaSearch className="text-5xl text-green-500 mb-4 mx-auto" />,
      title: "Instant Schedule Overview",
      description: "Quickly view your calendar for today, tomorrow, or next week with natural language queries.",
    },
    {
      icon: <FaMicrophoneAlt className="text-5xl text-destructive mb-4 mx-auto" />,
      title: "Intuitive Voice & Text Input",
      description: "Interact with your calendar using voice or text. Our intelligent input understands your needs.",
    },
    {
      icon: <FaBrain className="text-5xl text-purple-500 mb-4 mx-auto" />,
      title: "Advanced AI Processing",
      description: "Leverage Google's Generative AI to accurately interpret requests and manage your schedule.",
    },
  ];

  return (
    <section className="py-20 bg-secondary px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-5xl sm:text-6xl font-extrabold text-foreground mb-6 leading-tight">
          Designed to Simplify Your Life
        </h2>
        <p className="text-xl text-muted-foreground mb-16 max-w-3xl mx-auto leading-relaxed">
          VoiceCalendar integrates powerful AI with a user-friendly interface to make managing your
          Google Calendar effortless and intuitive.
        </p>

        <div className="flex flex-wrap justify-center gap-8 sm:gap-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card text-card-foreground p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-border flex flex-col items-center w-full sm:w-[calc(50%-20px)] lg:w-[calc(33.333%-27px)]"
            >
              {feature.icon}
              <h3 className="text-2xl font-bold text-primary mb-3 mt-4">{feature.title}</h3>
              <p className="text-muted-foreground text-lg">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

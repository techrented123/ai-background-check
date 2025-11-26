import Image from "next/image";
import React from "react";

const Header: React.FC = () => {
  return (
    <header className="shadow-sm text-white">
      <div className="container mx-auto px-4 py-2">
        <div className="">
          <div className="flex flex-row-reverse md:flex-row items-center justify-between md:justify-center  md:space-x-2">
            <div
              className="md:absolute left-8"
            >
              <h1 className="text-lg md:text-2xl font-bold text-[#293074]">
                Rented123
              </h1>
              <p className="text-sm text-[#293074] md:block">
                Intelligent Background Check
              </p>
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="https://rented123-brand-files.s3.us-west-2.amazonaws.com/logo_white.svg"
                alt="logo"
                width="80"
                height={80}
                className="w-15 h-15 md:w-20 md:h-20 text-center"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

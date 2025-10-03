import Image from "next/image";
import React from "react";

const Header: React.FC = () => {
  return (
    <header className="shadow-sm text-white">
      <div className="container mx-auto px-4 py-2">
        <div className="">
          <div className="flex items-center justify-between md:justify-start md:space-x-2">
            <Image
              src="https://rented123-brand-files.s3.us-west-2.amazonaws.com/logo_white.svg"
              alt="logo"
              width="80"
              height={80}
              className="w-15 h-15 md:w-20 md:h-20"
            />

            <div>
              <h1 className="text-lg md:text-2xl font-bold text-[#293074]">
                Rented123
              </h1>
              <p className="text-sm text-[#293074] hidden md:block">
                Intelligent Background Check
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

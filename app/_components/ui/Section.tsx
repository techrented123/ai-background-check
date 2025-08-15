export const Section: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
      <h4 className="font-medium">{title}</h4>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

const RecentStreams: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Streams</CardTitle>
        <CardDescription>
          Your past livestreams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-gray-500">No recent streams found.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentStreams; 
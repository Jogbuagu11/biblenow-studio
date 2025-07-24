import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

const UpcomingStreams: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Streams</CardTitle>
        <CardDescription>
          Your scheduled livestreams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-gray-500">No upcoming streams scheduled.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingStreams; 
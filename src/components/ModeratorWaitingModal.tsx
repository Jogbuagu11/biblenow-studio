import React from 'react';
import Button from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';

interface ModeratorWaitingModalProps {
  isOpen: boolean;
  onWaitForModerator: () => void;
  onLogin: () => void;
  onBypass: () => void;
}

const ModeratorWaitingModal: React.FC<ModeratorWaitingModalProps> = ({
  isOpen,
  onWaitForModerator,
  onLogin,
  onBypass,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-chocolate-800 border-chocolate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Waiting for a moderator...
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            The conference has not yet started because no moderators have yet arrived. 
            If you'd like to become a moderator please log-in. Otherwise, please wait.
          </p>
          
          <div className="flex flex-col space-y-3">
            <Button
              variant="outline"
              onClick={onWaitForModerator}
              className="w-full bg-transparent border-chocolate-600 text-white hover:bg-chocolate-700"
            >
              Wait for moderator
            </Button>
            
            <Button
              onClick={onLogin}
              className="w-full bg-chocolate-600 hover:bg-chocolate-700 text-white"
            >
              Log-in
            </Button>
            
            <Button
              variant="outline"
              onClick={onBypass}
              className="w-full bg-transparent text-gray-400 hover:text-white hover:bg-chocolate-700 border border-chocolate-600"
            >
              Bypass requirement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModeratorWaitingModal; 
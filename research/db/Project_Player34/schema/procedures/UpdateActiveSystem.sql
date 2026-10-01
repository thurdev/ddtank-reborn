-- SQL_STORED_PROCEDURE dbo.UpdateActiveSystem (modified 2021-06-04T06:27:28.763)
CREATE  PROCEDURE [dbo].UpdateActiveSystem
        @ID int 
       ,@UserID int 
       ,@canOpenCounts int 
       ,@canEagleEyeCounts int 
       ,@lastFlushTime datetime 
       ,@isShowAll bit 
	    
 AS
   BEGIN
		UPDATE [dbo].[Sys_Active_System_Data]
                SET    [UserID] = @UserID
                      ,[canOpenCounts] = @canOpenCounts
                      ,[canEagleEyeCounts] = @canEagleEyeCounts
                      ,[lastFlushTime] = @lastFlushTime
                      ,[isShowAll] = @isShowAll
		WHERE [ID] = @ID
		RETURN 0
    END
IF(@@ERROR <> 0)
BEGIN
  RETURN 1
END

GO

-- SQL_STORED_PROCEDURE dbo.SP_Active_System_Data_Update (modified 2022-01-28T05:36:12.247)

CREATE  PROCEDURE [dbo].[SP_Active_System_Data_Update]
        @ID int 
       ,@UserID int 
       ,@canOpenCounts int 
       ,@canEagleEyeCounts int 
       ,@lastFlushTime datetime 
       ,@isShowAll bit
	   ,@ChickActiveData nvarchar(max)
	   ,@LuckystarCoins int
	   ,@ActiveMoney int
	    
 AS
   BEGIN
		UPDATE [dbo].[Sys_Active_System_Data]
                SET    [UserID] = @UserID
                      ,[canOpenCounts] = @canOpenCounts
                      ,[canEagleEyeCounts] = @canEagleEyeCounts
                      ,[lastFlushTime] = @lastFlushTime
                      ,[isShowAll] = @isShowAll
					  ,[ChickActiveData] = @ChickActiveData
					  ,[LuckystarCoins] = @LuckystarCoins
					  ,[ActiveMoney] = @ActiveMoney
		WHERE [ID] = @ID
		RETURN 0
    END
IF(@@ERROR <> 0)
BEGIN
  RETURN 1
END

GO

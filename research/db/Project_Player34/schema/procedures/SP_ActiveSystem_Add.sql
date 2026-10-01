-- SQL_STORED_PROCEDURE dbo.SP_ActiveSystem_Add (modified 2022-01-28T05:36:41.357)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_ActiveSystem_Add]
@ID int output
,@UserID int
,@canEagleEyeCounts int
,@canOpenCounts int
,@isShowAll bit
,@lastFlushTime datetime
,@ChickActiveData nvarchar(max)
,@LuckystarCoins int
,@ActiveMoney int

AS
BEGIN
DECLARE @exitCount int
SELECT @exitCount = ISNULL(COUNT(*),0) FROM [dbo].[Sys_Active_System_Data] WHERE [UserID] =@UserID
IF (@exitCount = 0)
BEGIN
	Insert Into Sys_Active_System_Data([canEagleEyeCounts], [canOpenCounts], [isShowAll], [lastFlushTime], [ChickActiveData], [LuckystarCoins], [ActiveMoney]) 
	VALUES (@canEagleEyeCounts, @canOpenCounts, @isShowAll, @lastFlushTime, @ChickActiveData, @LuckystarCoins, @ActiveMoney)
	SELECT @@IDENTITY AS 'IDENTITY'
    SET @ID=@@IDENTITY
	IF(@@ERROR <> 0)
	BEGIN
	  RETURN 1
	END
END
ELSE 
	BEGIN
		RETURN 0
	END
END
GO

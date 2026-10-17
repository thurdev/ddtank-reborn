-- SQL_STORED_PROCEDURE dbo.SP_Reset_DragonBoat_Data (modified 2015-01-26T20:00:39.193)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Reset_DragonBoat_Data]
AS
BEGIN
UPDATE [dbo].[Sys_Active_System_Data]
   SET [dayScore] = 0
	  ,[totalScore] = 0
      ,[CanGetGift] = 1
 WHERE [UserID] > 0

UPDATE [dbo].[Communal_Active]
   SET [IsReset] = 1
	  ,[IsSendAward] = 1
 WHERE [ActiveID] > 0
 
END

GO

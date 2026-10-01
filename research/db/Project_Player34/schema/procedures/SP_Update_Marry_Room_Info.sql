-- SQL_STORED_PROCEDURE dbo.SP_Update_Marry_Room_Info (modified 2021-06-04T05:18:35.843)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<婚姻：更新结婚房间信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_Marry_Room_Info]  
@ID int,
@AvailTime int,
@BreakTime datetime,
@roomIntroduction nvarchar(300),
@isHymeneal bit,
@Name nvarchar(50),
@Pwd nvarchar(15),
@IsGunsaluteUsed bit

AS

update Marry_Room_Info set AvailTime = @AvailTime,BreakTime=@BreakTime,roomIntroduction=@roomIntroduction,isHymeneal=@isHymeneal,[Name]=@Name,Pwd=@Pwd,IsGunsaluteUsed=@IsGunsaluteUsed where [ID] = @ID








GO

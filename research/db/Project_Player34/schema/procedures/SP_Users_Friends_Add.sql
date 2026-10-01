-- SQL_STORED_PROCEDURE dbo.SP_Users_Friends_Add (modified 2021-06-04T05:18:36.107)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：添加一条用户信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Friends_Add] 
 @ID int out, 
 @UserID int, 
 @FriendID int, 
 @AddDate DateTime, 
 @Remark nvarchar(400), 
 @IsExist bit,
 @Relation int
AS  
declare  @temp int
select @temp = count(*) from Sys_Users_Friends where UserID=@UserID and FriendID=@FriendID
if @temp=0 
   begin 
     INSERT INTO Sys_Users_Friends( UserID, FriendID, AddDate, Remark, IsExist,Relation) 
     VALUES( @UserID, @FriendID, @AddDate, @Remark, @IsExist,@Relation)
     select @@identity as 'identity'
     set @ID=@@identity    
 end
else
begin
 update Sys_Users_Friends set IsExist = 1,Remark=@Remark,AddDate=@AddDate,Relation=@Relation where UserID=@UserID and FriendID=@FriendID
end








GO

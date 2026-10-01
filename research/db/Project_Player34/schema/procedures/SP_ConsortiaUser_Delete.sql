-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaUser_Delete (modified 2021-06-04T05:18:35.197)







-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：踢出公会中的一个用户>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaUser_Delete]   
 @UserID int,
 @KickUserID int,
 @ConsortiaID int,
 @NickName Nvarchar(200) output
AS

set @NickName=''
declare @Level int
declare @tempRight INT
/*踢人时间*/
DECLARE @KickDate DATETIME   
/*已踢人数量*/
DECLARE @KickCount INT       
/*踢人上限*/
DECLARE @KickMax INT         
select @tempRight=[Right],@Level=[Level]  from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null 
begin
  return 2
end

if @UserID<>@KickUserID and (@tempRight&32)=0
begin
  return 2
end

if @UserID=@KickUserID and @Level=1
begin
  return 3
end

declare @count int 
select @count=count(*) from Consortia where ChairmanID=@KickUserID and ConsortiaID=@ConsortiaID and IsExist=1
if @count>0
begin
  return 4
end

/*每天已踢出人数@KickCount=KickCount*/
SELECT TOP 1 @KickDate=KickDate,@KickMax=KickMax, @KickCount=KickCount FROM dbo.Consortia A
       LEFT OUTER JOIN dbo.Consortia_Level B
            ON A.Level=b.Level
            WHERE ConsortiaID=@ConsortiaID and IsExist=1


IF(@UserID!=@KickUserID)
  BEGIN
    IF (@KickDate=Convert(VarChar(10),GETDATE(),120) AND @KickCount>0) OR (@KickDate!=Convert(VarChar(10),GETDATE(),120))
       BEGIN
          IF(@KickDate!=Convert(VarChar(10),GETDATE(),120))
            SET @KickCount=@KickMax
          SET @KickDate=CONVERT(VARCHAR(10),Getdate(),120)
          SET @KickCount=@KickCount-1          
       END
    ELSE
         RETURN 5   /*每日踢人已达上限*/
  END
    
set xact_abort on
begin tran 

Update Consortia set [Count] = [Count]-1,KickDate=@KickDate,KickCount=@KickCount where ConsortiaID=@ConsortiaID 

 
if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Users set IsExist = 0 where  UserID=@KickUserID and ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0 or @@ROWCOUNT=0
begin
  rollback tran
  return @@error
end

--Update Sys_Users_Detail set @NickName=NickName,ConsortiaID = 0,RichesOffer=0,RichesRob=0 where  UserID=@KickUserID and ConsortiaID=@ConsortiaID and IsExist=1
Update Sys_Users_Detail set @NickName=NickName,ConsortiaID = 0,RichesOffer=0,RichesRob=0 where  UserID=@KickUserID and ConsortiaID=@ConsortiaID

if(@UserID=@KickUserID)
begin 
insert into Consortia_Event(ConsortiaID,[Date],Type,NickName,EventValue,ManagerName,IsExist,Remark)
values(@ConsortiaID,GETDATE(),8,(SELECT NickName FROM Sys_Users_Detail WHERE UserID = @KickUserID),0,NULL,1,'')
end

if(@UserID!=@KickUserID)
begin
insert into Consortia_Event(ConsortiaID,[Date],Type,NickName,EventValue,ManagerName,IsExist,Remark)
values(@ConsortiaID,GETDATE(),7,(SELECT NickName FROM Sys_Users_Detail WHERE UserID = @KickUserID),0,(SELECT NickName FROM Sys_Users_Detail WHERE UserID = @UserID),1,'')
end

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0







GO

-- SQL_STORED_PROCEDURE dbo.SP_Insert_Marry_Notice (modified 2021-06-04T05:18:35.480)




-- 描述：对申请消息应答
--功能： 1、申请结婚【插入结婚申请信息】
--             2、应答信息【将以前的消息设为已过期，发出通知给对方】         
--             3、发出离婚【插入离婚信息】
CREATE   PROCEDURE [dbo].[SP_Insert_Marry_Notice]
@UserID int,
@ApplyUserID int,
@ApplyUserName nvarchar(50),
@ApplyType int,
@ApplyResult bit,
@LoveProclamation nvarchar(300),
@AnswerId int,
@ouototal int=0 output
AS
--1:定义变量
Declare @Counts int
Declare @tempUserName nvarchar(50)
SET @ouototal=0
--2:-结婚应答
If(@ApplyType=2)        
  Begin
     Update Marry_Apply  Set isDeal=1,isExist=0   Where  ApplyType=1 And isDeal=0 And  ApplyUserID = @UserID And UserID=@ApplyUserID And Id=@AnswerId   --将邀请信息设为已过期     
     --判断双方是否结婚了
     Select @Counts=Count(0) From sys_users_detail  Where  (UserID=@UserID Or UserID=@ApplyUserID) And IsMarried=0   
     If(@Counts!=2)
       BEGIN
          IF(@ApplyResult = 0)    
            Begin
              Insert Into Marry_Apply(UserID,ApplyUserID,ApplyUserName,ApplyType,ApplyResult,LoveProclamation,isDeal,isExist) Values(@UserID,@ApplyUserID,@ApplyUserName,@ApplyType,@ApplyResult,@LoveProclamation,0,1)
              Select @@identity As 'identity'
              Set @ouototal=@@identity  
            End  
         Return 1
       End
     If(@ApplyResult = 1)
       Begin
           Update Sys_Users_Detail Set IsMarried=1,SpouseID=@ApplyUserID,SpouseName=@ApplyUserName Where UserID=@UserID
           Select @tempUserName=NickName From Sys_Users_Detail Where UserID=@UserID
           Update Sys_Users_Detail Set IsMarried=1,SpouseID=@UserID,SpouseName=@tempUserName Where UserID=@ApplyUserID
       End  
  End

--3:离婚信息
If(@ApplyType=3)
  Begin
    Select @Counts=Count(0) From sys_users_detail  Where  (UserID=@UserID Or UserID=@ApplyUserID) And IsMarried=1
    If(@Counts!=2)
       Begin
          Return 1
       End
    Update Sys_Users_Detail set IsMarried=0,SpouseID=0,SpouseName='',IsGotRing=0,IsCreatedMarryRoom=0,SelfMarryRoomID=0  where UserID=@UserID or UserID=@ApplyUserID
  End

--最后:插入沟通信息
Insert Into Marry_Apply(UserID,ApplyUserID,ApplyUserName,ApplyType,ApplyResult,LoveProclamation,isDeal,isExist) Values(@UserID,@ApplyUserID,@ApplyUserName,@ApplyType,@ApplyResult,@LoveProclamation,0,1)
Select @@identity As 'identity'
Set @ouototal=@@identity  
Return 0



/*
declare @Counts int

if(@ApplyType=2)             --2:-结婚应答
begin
  Select @Counts=Count(0) From sys_users_detail  Where  (UserID=@UserID Or UserID=@ApplyUserID) And IsMarried=0   
  if(@Counts!=2)
  begin
    return 1
  end
end

if(@ApplyType=3)              --3:离婚
begin
  Select @Counts=Count(0) From sys_users_detail  Where  (UserID=@UserID Or UserID=@ApplyUserID) And IsMarried=1  
  if(@Counts!=2)
    begin
      return 1
    end
end

set xact_abort on
begin tran
                                       --1:邀请结婚 
insert into Marry_Apply(UserID,ApplyUserID,ApplyUserName,ApplyType,ApplyResult,LoveProclamation,isDeal,isExist) values(@UserID,@ApplyUserID,@ApplyUserName,@ApplyType,@ApplyResult,@LoveProclamation,0,1)
select @@identity as 'identity'
set @ouototal=@@identity  

if @@error<>0
begin
  rollback tran
  return @@error
end

if(@ApplyType = 2)
begin
  declare @ID int
  set @ID = 0
  select top 1 @ID=IsNull([ID],0) from Marry_Apply where  ApplyType=1 and isDeal=0 and  ApplyUserID = @UserID and UserID=@ApplyUserID

  if(@ID = 0)
  begin
     return 1
  end
  else
  begin
     update Marry_Apply set isDeal=1 where [ID]=@ID
     if @@error<>0
     begin
        rollback tran
        return @@error
     end
  end


  if(@ApplyResult = 1)
  begin
	update sys_users_detail set IsMarried=1,SpouseID=@ApplyUserID,SpouseName=@ApplyUserName where UserID=@UserID
	if @@error<>0
	begin
	  rollback tran
	  return @@error
	end

	declare @tempUserName nvarchar(50)
    	select @tempUserName=NickName from sys_users_detail where UserID=@UserID
    	update sys_users_detail set IsMarried=1,SpouseID=@UserID,SpouseName=@tempUserName where UserID=@ApplyUserID
	if @@error<>0
	begin
	  rollback tran
	  return @@error
	end
  end  
end
else if(@ApplyType = 3)
begin
  	update sys_users_detail set IsMarried=0,SpouseID=0,SpouseName='',IsGotRing=0,IsCreatedMarryRoom=0,SelfMarryRoomID=0  where UserID=@UserID or UserID=@ApplyUserID
	if @@error<>0
	begin
	  rollback tran
	  return @@error
	end
end

commit tran
set xact_abort off
return 0*/








GO
